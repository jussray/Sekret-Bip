import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { getSupabase } from '@/utils/supabase';
import { getCurrentFounderProfile, isFounderProfile, type FounderProfile } from '@/services/founderAudit';
import {
  controlRoomIssuesService,
  assignIssue,
  getIssueHistory,
  updateIssueNotes,
  type ControlRoomIssue,
  type IssueHistoryEntry,
  type IssueStatus,
} from '@/services/controlRoomIssues';
import { founderIdeasService, type FounderIdea, type IdeaStatus } from '@/services/founderIdeas';
import {
  loadControlRoomAnalytics,
  type ControlRoomAnalytics,
  type MetricPoint,
  type ReleaseHealth,
} from '@/services/controlRoomAnalytics';
import {
  CONTROL_ROOM_ALLOWED_PATHS,
  CONTROL_ROOM_ENTRY_ROUTE,
  CONTROL_ROOM_FORBIDDEN_PATHS,
  CONTROL_ROOM_PLACEMENT_RULES,
  CONTROL_ROOM_SCREEN_ENTRY,
} from '@/config/controlRoomPlacement';
import { loadControlRoomOperatingModel } from '@/services/controlRoomMissionEngine';
import {
  getLocalControlRoomAgentHealth,
  runLocalControlRoomMission,
  type LocalAgentHealth,
  type LocalAgentStatus,
  type LocalMissionRun,
} from '@/services/controlRoomLocalAgent';

type Tab = 'overview' | 'missions' | 'operations' | 'issues' | 'releases' | 'dashboards' | 'ideas' | 'redteam';
type Dashboard = 'cost' | 'companions' | 'voice' | 'signals' | 'adoption' | 'crashes';
type SavedView = { id:string; name:string; severity:string; status:string; category:string; query:string };

const SAVED_KEY = 'control-room:saved-views:v1';
const OODA_KEY  = 'control-room:ooda-decide:last';
const STATUSES: IssueStatus[] = ['open','reported','investigating','planned','building','testing','resolved','ignored'];
const SEVERITIES = ['all','critical','error','warning','info'] as const;
const COLORS: Record<string,string> = { critical:'#fb7185', error:'#fb923c', warning:'#facc15', info:'#60a5fa' };
const emptyAnalytics: ControlRoomAnalytics = { cost:{estimatedUsd:0,requests:0,tokens:0,byProvider:[]}, companions:[], voice:[], signals:[], adoption:[], crashes:[], releases:[] };
const operatingModel = loadControlRoomOperatingModel();

// ─── Lindy checks ────────────────────────────────────────────────────────────
const LINDY_CHECKS = [
  { id:'l1', q:'Would a 15-year-old in 2036 still need this?' },
  { id:'l2', q:'Does it respect privacy-by-default without extra config?' },
  { id:'l3', q:'Could a solo founder maintain this in year 3?' },
  { id:'l4', q:'Does it make the companion feel more human, not more app?' },
  { id:'l5', q:'Is the data model simple enough to explain in one sentence?' },
  { id:'l6', q:'Would this work without an internet connection?' },
  { id:'l7', q:'Does it remove a pain point vs add a feature?' },
] as const;

// ─── L99 placement questions ─────────────────────────────────────────────────
const L99_QUESTIONS = [
  { id:'q1', q:'Does it need live access to issues, analytics, or releases?' },
  { id:'q2', q:'Is the audience "founder reviewing product" (not teen or parent)?' },
  { id:'q3', q:'Does it write to or read from control_room_* tables?' },
  { id:'q4', q:'Would you only open it once a day or less?' },
] as const;

function fmt(value?:string|null){ if(!value)return '—'; const date=new Date(value); return Number.isNaN(date.getTime())?value:date.toLocaleString(); }
function title(value:string){ return value.replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); }
function activeSnooze(issue:ControlRoomIssue & { snoozed_until?:string|null }){ return !!issue.snoozed_until && new Date(issue.snoozed_until).getTime()>Date.now(); }

function Chip({label,active,onPress}:{label:string;active:boolean;onPress:()=>void}){
  return <TouchableOpacity style={[s.chip,active&&s.chipOn]} onPress={onPress}><Text style={[s.chipText,active&&s.chipTextOn]}>{label}</Text></TouchableOpacity>;
}

function MetricList({titleText,items,empty='No telemetry yet.'}:{titleText:string;items:MetricPoint[];empty?:string}){
  const max=Math.max(1,...items.map(i=>i.value));
  return <View style={s.panel}><Text style={s.panelTitle}>{titleText}</Text>{items.length?items.map(item=><View key={item.label} style={s.metricRow}><View style={s.metricTop}><Text style={s.metricLabel}>{title(item.label)}</Text><Text style={s.metricValue}>{Number.isInteger(item.value)?item.value:item.value.toFixed(4)}</Text></View><View style={s.bar}><View style={[s.barFill,{width:`${Math.max(4,item.value/max*100)}%`}]} /></View></View>):<Text style={s.muted}>{empty}</Text>}</View>;
}

function ReleaseCard({release,previous}:{release:ReleaseHealth;previous?:ReleaseHealth}){
  const delta=previous?release.error_count-previous.error_count:0;
  return <View style={s.card}><View style={s.row}><Text style={s.cardTitle}>{release.commit_sha.slice(0,12)}</Text><Text style={[s.health,{color:release.status==='healthy'?'#4ade80':release.status==='watch'?'#facc15':'#fb7185'}]}>{release.status}</Text></View><Text style={s.muted}>{release.branch} · {fmt(release.deployed_at)}</Text><View style={s.statsRow}><Text style={s.smallStat}>{release.issue_count} issues</Text><Text style={s.smallStat}>{release.error_count} errors</Text><Text style={s.smallStat}>{release.regression_count} regressions</Text></View>{previous?<Text style={s.delta}>{delta===0?'No error change':`${delta>0?'+':''}${delta} errors vs prior release`}</Text>:null}</View>;
}

function IssueDetail({issue,onClose,onChanged}:{issue:(ControlRoomIssue & {snoozed_until?:string|null})|null;onClose:()=>void;onChanged:()=>Promise<void>}){
  const[notes,setNotes]=useState(''); const[owner,setOwner]=useState(''); const[history,setHistory]=useState<IssueHistoryEntry[]>([]); const[busy,setBusy]=useState(false);
  useEffect(()=>{ if(!issue)return; setNotes(issue.notes??''); setOwner(issue.assigned_to??''); void getIssueHistory(issue.id).then(setHistory); },[issue]);
  if(!issue)return null;
  const act=async(work:()=>Promise<boolean>)=>{setBusy(true);try{if(await work()){await onChanged();setHistory(await getIssueHistory(issue.id));}}finally{setBusy(false);}};
  const snooze=(days:number|null)=>act(async()=>{const sb=getSupabase();if(!sb)return false;const until=days?new Date(Date.now()+days*86400000).toISOString():null;const{error}=await sb.from('control_room_issues').update({snoozed_until:until,updated_at:new Date().toISOString()}).eq('id',issue.id);if(error)return false;await sb.from('control_room_issue_history').insert({issue_id:issue.id,field:'snoozed_until',old_value:issue.snoozed_until??null,new_value:until});return true;});
  return <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}><ScrollView style={s.modal} contentContainerStyle={s.modalBody}><Text style={[s.severity,{color:COLORS[issue.severity]}]}>{issue.severity.toUpperCase()}</Text><Text style={s.modalTitle}>{issue.title}</Text><Text style={s.body}>{issue.summary}</Text><View style={s.info}><Text style={s.infoText}>Status: {issue.status}</Text><Text style={s.infoText}>Source: {issue.source}</Text><Text style={[s.infoText,issue.trust_level==='unverified'&&{color:'#facc15'}]}>Trust: {issue.trust_level}{issue.trust_level==='unverified'?' (self-reported, not verified)':''}</Text><Text style={s.infoText}>Surface: {issue.affected_surface??'—'}</Text><Text style={s.infoText}>Occurrences: {issue.occurrence_count}</Text><Text style={s.infoText}>Release: {issue.linked_release??'—'}</Text><Text style={s.infoText}>Snoozed: {fmt(issue.snoozed_until)}</Text></View><Text style={s.section}>Workflow status</Text><View style={s.wrap}>{STATUSES.map(status=><Chip key={status} label={status} active={issue.status===status} onPress={()=>void act(()=>controlRoomIssuesService.updateStatus(issue.id,status))}/>)}</View><Text style={s.section}>Assignment owner</Text><TextInput value={owner} onChangeText={setOwner} placeholder="Name, team, or email" placeholderTextColor="#6b7280" style={s.input}/><TouchableOpacity style={s.primary} onPress={()=>void act(()=>assignIssue(issue.id,owner.trim()||null))}><Text style={s.primaryText}>Save assignment</Text></TouchableOpacity><Text style={s.section}>Issue notes</Text><TextInput value={notes} onChangeText={setNotes} multiline style={[s.input,s.notes]} placeholder="Diagnosis, next step, rollback note…" placeholderTextColor="#6b7280"/><TouchableOpacity style={s.primary} onPress={()=>void act(()=>updateIssueNotes(issue.id,notes))}><Text style={s.primaryText}>Save notes</Text></TouchableOpacity><Text style={s.section}>Snooze</Text><View style={s.wrap}><Chip label="1 day" active={false} onPress={()=>void snooze(1)}/><Chip label="3 days" active={false} onPress={()=>void snooze(3)}/><Chip label="7 days" active={false} onPress={()=>void snooze(7)}/><Chip label="Wake now" active={false} onPress={()=>void snooze(null)}/></View><Text style={s.section}>History timeline</Text>{history.length?history.map(item=><View key={item.id} style={s.history}><Text style={s.historyTitle}>{title(item.field)}</Text><Text style={s.muted}>{item.old_value??'—'} → {item.new_value??'—'}</Text><Text style={s.historyDate}>{fmt(item.changed_at)}</Text></View>):<Text style={s.muted}>No changes recorded yet.</Text>}<TouchableOpacity style={s.close} onPress={onClose}><Text style={s.primaryText}>{busy?'Saving…':'Close'}</Text></TouchableOpacity></ScrollView></Modal>;
}

// ─── OODA observe signal derivation ──────────────────────────────────────────
function orientSignal(criticalCount:number, errorDelta:number, aiCost:number, adoptionTop:string){
  if(criticalCount>0) return { color:'#fb7185', label:'CRITICAL SIGNAL', body:`${criticalCount} critical issue${criticalCount>1?'s':''} open. Everything else is secondary.`, route:'issues' as Tab };
  if(errorDelta>5)    return { color:'#fb923c', label:'REGRESSION SIGNAL', body:`+${errorDelta} errors vs prior release. This release is under watch.`, route:'releases' as Tab };
  if(aiCost>50)       return { color:'#facc15', label:'COST SIGNAL', body:`$${aiCost.toFixed(2)} AI spend today. Check companion call volume.`, route:'dashboards' as Tab };
  return { color:'#4ade80', label:'STABLE', body:`No critical signals. Top surface: ${adoptionTop}. Lindy check is your move.`, route:'overview' as Tab };
}

// ─── Toggle button for Lindy & L99 ───────────────────────────────────────────
function TriToggle({value,onChange,accent='#a78bfa'}:{value:boolean|null;onChange:(v:boolean|null)=>void;accent?:string}){
  const cycle=()=>onChange(value===null?true:value===true?false:null);
  return <TouchableOpacity onPress={cycle} style={{width:32,height:32,borderRadius:16,borderWidth:2,borderColor:value===true?accent:value===false?'#fb7185':'#332c48',backgroundColor:value===true?accent+'20':value===false?'#fb718520':'transparent',alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:14,color:'#fff'}}>{value===true?'✓':value===false?'✕':'·'}</Text></TouchableOpacity>;
}

export default function DevControlRoomWorkspace(){
  const[loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[profile,setProfile]=useState<FounderProfile|null>(null),[issues,setIssues]=useState<(ControlRoomIssue&{snoozed_until?:string|null})[]>([]),[ideas,setIdeas]=useState<FounderIdea[]>([]),[analytics,setAnalytics]=useState(emptyAnalytics),[tab,setTab]=useState<Tab>('overview'),[dashboard,setDashboard]=useState<Dashboard>('cost'),[selected,setSelected]=useState<(ControlRoomIssue&{snoozed_until?:string|null})|null>(null),[severity,setSeverity]=useState('all'),[status,setStatus]=useState('all'),[category,setCategory]=useState('all'),[query,setQuery]=useState(''),[saved,setSaved]=useState<SavedView[]>([]),[viewName,setViewName]=useState('');
  const[localAgentStatus,setLocalAgentStatus]=useState<LocalAgentStatus>('checking');
  const[localAgentHealth,setLocalAgentHealth]=useState<LocalAgentHealth|null>(null);
  const[localAgentError,setLocalAgentError]=useState('');
  const[missionRuns,setMissionRuns]=useState<Record<string,LocalMissionRun>>({});
  const[runningMission,setRunningMission]=useState<string|null>(null);

  // Redteam state
  const[decideMemo,setDecideMemo]=useState('');
  const[lindyTarget,setLindyTarget]=useState('');
  const[lindyAnswers,setLindyAnswers]=useState<Record<string,boolean|null>>({});
  const[placementTarget,setPlacementTarget]=useState('');
  const[l99Answers,setL99Answers]=useState<Record<string,boolean|null>>({});

  const refreshLocalAgent=useCallback(async()=>{
    setLocalAgentStatus('checking');
    try{
      const health=await getLocalControlRoomAgentHealth();
      setLocalAgentHealth(health);
      setLocalAgentStatus('online');
      setLocalAgentError('');
      if(health.latestRun)setMissionRuns(current=>({...current,[health.latestRun!.missionId]:health.latestRun!}));
    }catch(error){
      setLocalAgentHealth(null);
      setLocalAgentStatus('offline');
      setLocalAgentError(error instanceof Error?error.message:'local_agent_unavailable');
    }
  },[]);

  const load=useCallback(async()=>{
    const p=await getCurrentFounderProfile();setProfile(p);
    if(isFounderProfile(p)){
      const[i,a,d]=await Promise.all([controlRoomIssuesService.listAll(300),loadControlRoomAnalytics(30),founderIdeasService.list()]);
      setIssues(i as (ControlRoomIssue&{snoozed_until?:string|null})[]);
      setAnalytics(a);setIdeas(d);
      try{setSaved(JSON.parse(await AsyncStorage.getItem(SAVED_KEY)||'[]') as SavedView[]);}catch{setSaved([]);}
      try{const memo=await AsyncStorage.getItem(OODA_KEY);if(memo)setDecideMemo(memo);}catch{}
      void refreshLocalAgent();
    }
    setLoading(false);
  },[refreshLocalAgent]);
  useEffect(()=>{void load();},[load]);
  const refresh=useCallback(async()=>{setRefreshing(true);try{await load();}finally{setRefreshing(false);}},[load]);
  const filtered=useMemo(()=>issues.filter(i=>severity==='all'||i.severity===severity).filter(i=>status==='all'||status==='snoozed'||i.status===status).filter(i=>category==='all'||i.category===category).filter(i=>!query.trim()||`${i.title} ${i.summary} ${i.affected_surface??''}`.toLowerCase().includes(query.toLowerCase())).filter(i=>status==='snoozed'?activeSnooze(i):status==='all'?!activeSnooze(i):true),[issues,severity,status,category,query]);
  const active=issues.filter(i=>!['resolved','ignored'].includes(i.status)&&!activeSnooze(i));
  const saveCurrent=async()=>{if(!viewName.trim())return;const next=[...saved,{id:String(Date.now()),name:viewName.trim(),severity,status,category,query}].slice(-12);setSaved(next);setViewName('');await AsyncStorage.setItem(SAVED_KEY,JSON.stringify(next));};
  const applyView=(v:SavedView)=>{setSeverity(v.severity);setStatus(v.status);setCategory(v.category);setQuery(v.query);setTab('issues');};
  const advance=async(id:string,next:IdeaStatus)=>{if(await founderIdeasService.updateStatus(id,next))setIdeas(v=>v.map(i=>i.id===id?{...i,status:next}:i));};
  const runMission=async(missionId:string)=>{
    setRunningMission(missionId);setLocalAgentError('');
    try{
      const run=await runLocalControlRoomMission(missionId);
      setMissionRuns(current=>({...current,[missionId]:run}));
      setLocalAgentHealth(current=>current?{...current,activeMission:null,latestRun:run}:current);
      setLocalAgentStatus('online');
    }catch(error){
      setLocalAgentError(error instanceof Error?error.message:'mission_failed');
      await refreshLocalAgent();
    }finally{
      setRunningMission(null);
    }
  };

  if(loading)return <View style={s.center}><ActivityIndicator color="#a78bfa"/><Text style={s.muted}>Opening Control Room…</Text></View>;
  if(!isFounderProfile(profile))return <View style={s.center}><Text style={s.lock}>🔒</Text><Text style={s.modalTitle}>Developer tools locked</Text><TouchableOpacity style={s.primary} onPress={()=>router.replace('/')}><Text style={s.primaryText}>Back to Bip</Text></TouchableOpacity></View>;

  const dashItems:Record<Dashboard,MetricPoint[]>={cost:analytics.cost.byProvider,companions:analytics.companions,voice:analytics.voice,signals:analytics.signals,adoption:analytics.adoption,crashes:analytics.crashes};

  // OODA derived values
  const criticalCount = active.filter(i=>i.severity==='critical').length;
  const errorDelta    = (analytics.releases[0]?.error_count??0) - (analytics.releases[1]?.error_count??0);
  const aiCost        = analytics.cost.estimatedUsd;
  const adoptionTop   = analytics.adoption[0]?.label ?? '—';
  const signal        = orientSignal(criticalCount, errorDelta, aiCost, adoptionTop);

  // Lindy verdict
  const lindyAllAnswered = lindyTarget.trim() && LINDY_CHECKS.every(c=>lindyAnswers[c.id]!==undefined&&lindyAnswers[c.id]!==null);
  const lindyPasses = lindyAllAnswered ? LINDY_CHECKS.filter(c=>lindyAnswers[c.id]===true).length : 0;
  const lindyVerdict = lindyAllAnswered
    ? lindyPasses>=6 ? {color:'#4ade80',label:'SHIP IT',body:'Lindy-approved. Build with confidence.'}
    : lindyPasses>=4 ? {color:'#facc15',label:'SIMPLIFY',body:`${7-lindyPasses} signal${7-lindyPasses>1?'s':''} against it. Reduce scope before building.`}
    : {color:'#fb7185',label:'KILL IT',body:`Only ${lindyPasses}/7 pass. This doesn't survive. Cut it.`}
    : null;

  // L99 verdict
  const l99AllAnswered = placementTarget.trim() && L99_QUESTIONS.every(q=>l99Answers[q.id]!==undefined&&l99Answers[q.id]!==null);
  const l99Yes = l99AllAnswered ? L99_QUESTIONS.filter(q=>l99Answers[q.id]===true).length : 0;
  const l99Verdict = l99AllAnswered
    ? l99Yes>=3 ? {color:'#a78bfa',label:'→ CONTROL ROOM',body:'Belongs in DevControlRoomWorkspace.tsx as a new tab or panel.'}
    : l99Yes===2 ? {color:'#facc15',label:'→ CLARIFY FIRST',body:'Mixed signal. Decide who the user is and try again.'}
    : {color:'#fb7185',label:'→ NOT THE CONTROL ROOM',body:'Belongs closer to the teen or parent experience, or in a shared utility.'}
    : null;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View style={s.headerTop}>
          <View style={{flex:1}}>
            <Text style={s.kicker}>SE'KRET BIP · FOUNDER</Text>
            <Text style={s.headerTitle}>Control Room</Text>
          </View>
          <TouchableOpacity style={s.linkBtn} onPress={()=>router.push('/(dev)/split-view')}>
            <Text style={s.linkBtnText}>Split View</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.muted}>Issues, releases, costs, AI health, product signals, and crash trends.</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabs}>
        {(['overview','missions','operations','issues','releases','dashboards','ideas','redteam'] as Tab[]).map(t=><Chip key={t} label={title(t)} active={tab===t} onPress={()=>setTab(t)}/>)}
      </ScrollView>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#a78bfa"/>}>

        {/* ── OVERVIEW ── */}
        {tab==='overview'?<>
          <View style={s.panel}><Text style={s.kicker}>MISSION FIRST</Text><Text style={s.panelTitle}>{operatingModel.primaryMission.title}</Text><Text style={s.body}>{operatingModel.primaryMission.founderPrompt}</Text><Text style={s.muted}>Local action: {operatingModel.primaryMission.primaryAction}</Text></View>
          <View style={s.heroStats}><View style={s.stat}><Text style={s.statNum}>{active.length}</Text><Text style={s.muted}>active issues</Text></View><View style={s.stat}><Text style={[s.statNum,{color:'#fb7185'}]}>{active.filter(i=>i.severity==='critical').length}</Text><Text style={s.muted}>critical</Text></View><View style={s.stat}><Text style={[s.statNum,{color:'#4ade80'}]}>{analytics.releases[0]?.status??'—'}</Text><Text style={s.muted}>latest release</Text></View></View>
          <View style={s.panel}><Text style={s.panelTitle}>30-day operating pulse</Text><Text style={s.bigMoney}>${analytics.cost.estimatedUsd.toFixed(2)}</Text><Text style={s.muted}>{analytics.cost.requests} AI/voice requests · {analytics.cost.tokens.toLocaleString()} tokens observed</Text></View>
          <MetricList titleText="Top adoption surfaces" items={analytics.adoption}/>
          <MetricList titleText="Crash trends" items={analytics.crashes}/>
        </>:null}

        {/* ── MISSIONS ── */}
        {tab==='missions'?<>
          <View style={s.panel}>
            <View style={s.row}>
              <Text style={s.panelTitle}>Local mission agent</Text>
              <Text style={[s.health,{color:localAgentStatus==='online'?'#4ade80':localAgentStatus==='checking'?'#facc15':'#fb7185'}]}>{localAgentStatus}</Text>
            </View>
            <Text style={s.body}>{localAgentStatus==='online'?`Ready on loopback · ${localAgentHealth?.allowedMissions.length??0} missions allowlisted`:'Start this workspace with npm run control-room:dev to enable Run buttons.'}</Text>
            {localAgentError&&localAgentError!=='local_agent_not_started'?<Text style={s.recovery}>Agent: {localAgentError}</Text>:null}
            <TouchableOpacity style={s.linkBtn} onPress={()=>void refreshLocalAgent()} disabled={localAgentStatus==='checking'}>
              <Text style={s.linkBtnText}>{localAgentStatus==='checking'?'Checking…':'Refresh agent status'}</Text>
            </TouchableOpacity>
          </View>
          {operatingModel.missions.map(mission=>{
            const run=missionRuns[mission.id];
            const runnable=Boolean(mission.localAgentMission);
            const isRunning=runningMission===mission.localAgentMission;
            const disabled=localAgentStatus!=='online'||runningMission!==null;
            const output=run?[run.stdout,run.stderr].filter(Boolean).join('\n').trim():'';
            return <View key={mission.id} style={s.card}>
              <View style={s.row}><Text style={s.severity}>{mission.category}</Text><Text style={s.health}>{mission.requiresNetwork?'network':'local-first'}</Text></View>
              <Text style={s.cardTitle}>{mission.title}</Text>
              <Text style={s.body}>{mission.founderPrompt}</Text>
              <Text style={s.muted}>Action: {mission.primaryAction}</Text>
              {runnable?<TouchableOpacity style={[s.primary,disabled&&s.disabled]} disabled={disabled} onPress={()=>void runMission(mission.localAgentMission!)}>
                <Text style={s.primaryText}>{isRunning?'Running…':`Run ${mission.title}`}</Text>
              </TouchableOpacity>:<Text style={s.recovery}>{mission.id==='ship-release'?'Manual release gate: verify exact-head evidence before any deployment.':'Launch the combined workspace command in a terminal.'}</Text>}
              {run?<View style={s.runResult}>
                <Text style={[s.health,{color:run.status==='passed'?'#4ade80':'#fb7185'}]}>{run.status.replace('_',' ')}</Text>
                <Text style={s.muted}>{Math.round(run.durationMs/1000)}s · exit {run.exitCode??'—'}</Text>
                {run.error?<Text style={s.recovery}>{run.error}</Text>:null}
                {output?<Text style={s.output} numberOfLines={18}>{output}</Text>:null}
              </View>:null}
              {mission.recoveryPath?<Text style={s.recovery}>Recovery: {mission.recoveryPath}</Text>:null}
            </View>;
          })}
        </>:null}

        {/* ── OPERATIONS ── */}
        {tab==='operations'?<>
          <View style={s.panel}><View style={s.row}><Text style={s.panelTitle}>Local execution</Text><Text style={[s.health,{color:localAgentStatus==='online'?'#4ade80':'#fb7185'}]}>{localAgentStatus}</Text></View><Text style={s.body}>{localAgentStatus==='online'?`Loopback agent ready. Active mission: ${localAgentHealth?.activeMission??'none'}`:'Offline until npm run control-room:dev starts the authenticated loopback agent.'}</Text></View>
          <View style={s.panel}><Text style={s.panelTitle}>Founder notifications</Text><Text style={s.body}>Mission reports, failure alerts, daily briefings, and release summaries route to {operatingModel.notificationDestination} when the Gmail connector is authenticated.</Text></View>
          <Text style={s.section}>Connectors</Text>
          {operatingModel.connectors.map(connector=><View key={connector.id} style={s.card}><View style={s.row}><Text style={s.cardTitle}>{connector.label}</Text><Text style={[s.health,{color:connector.health==='healthy'?'#4ade80':connector.health==='warning'?'#facc15':'#fb7185'}]}>{connector.health}</Text></View><Text style={s.body}>{connector.capabilities.join(' · ')}</Text><Text style={s.recovery}>Fallback: {connector.fallback}</Text></View>)}
          <Text style={s.section}>Workers</Text>
          {operatingModel.workers.map(worker=><View key={worker.id} style={s.card}><View style={s.row}><Text style={s.cardTitle}>{worker.label}</Text><Text style={s.health}>{worker.localFirst?'local-first':'hosted'}</Text></View><Text style={s.body}>{worker.capabilities.join(' · ')}</Text><Text style={s.muted}>Fallback worker: {worker.fallbackWorkerId??'none'}</Text></View>)}
        </>:null}

        {/* ── ISSUES ── */}
        {tab==='issues'?<>
          <TextInput value={query} onChangeText={setQuery} placeholder="Search title, summary, or surface" placeholderTextColor="#6b7280" style={s.input}/>
          <Text style={s.section}>Severity</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>{SEVERITIES.map(v=><Chip key={v} label={v} active={severity===v} onPress={()=>setSeverity(v)}/>)}</ScrollView>
          <Text style={s.section}>Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>{['all','snoozed',...STATUSES].map(v=><Chip key={v} label={v} active={status===v} onPress={()=>setStatus(v)}/>)}</ScrollView>
          <Text style={s.section}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>{['all',...Array.from(new Set(issues.map(i=>i.category)))].map(v=><Chip key={v} label={v} active={category===v} onPress={()=>setCategory(v)}/>)}</ScrollView>
          <View style={s.saveRow}><TextInput value={viewName} onChangeText={setViewName} placeholder="Saved view name" placeholderTextColor="#6b7280" style={[s.input,{flex:1}]}/><TouchableOpacity style={s.primary} onPress={()=>void saveCurrent()}><Text style={s.primaryText}>Save view</Text></TouchableOpacity></View>
          {saved.length?<ScrollView horizontal showsHorizontalScrollIndicator={false}>{saved.map(v=><Chip key={v.id} label={v.name} active={false} onPress={()=>applyView(v)}/>)}</ScrollView>:null}
          <Text style={s.result}>{filtered.length} issues</Text>
          {filtered.map(issue=><TouchableOpacity key={issue.id} style={s.card} onPress={()=>setSelected(issue)}><View style={s.row}><Text style={[s.severity,{color:COLORS[issue.severity]}]}>{issue.severity}</Text><Text style={s.health}>{activeSnooze(issue)?'snoozed':issue.status}</Text></View><Text style={s.cardTitle}>{issue.title}</Text><Text style={s.body} numberOfLines={2}>{issue.summary}</Text><Text style={s.muted}>{issue.category} · {issue.occurrence_count} occurrences · {issue.assigned_to||'unassigned'}</Text></TouchableOpacity>)}
        </>:null}

        {/* ── RELEASES ── */}
        {tab==='releases'?<>{analytics.releases.length?analytics.releases.map((r,index)=><ReleaseCard key={r.release_key} release={r} previous={analytics.releases[index+1]}/>):<Text style={s.muted}>No releases recorded yet. The next successful Cloudflare deployment will create one.</Text>}</>:null}

        {/* ── DASHBOARDS ── */}
        {tab==='dashboards'?<>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>{(['cost','companions','voice','signals','adoption','crashes'] as Dashboard[]).map(v=><Chip key={v} label={v} active={dashboard===v} onPress={()=>setDashboard(v)}/>)}</ScrollView>
          {dashboard==='cost'?<View style={s.panel}><Text style={s.panelTitle}>Infrastructure cost</Text><Text style={s.bigMoney}>${analytics.cost.estimatedUsd.toFixed(2)}</Text><Text style={s.muted}>{analytics.cost.requests} observed requests · {analytics.cost.tokens.toLocaleString()} tokens</Text></View>:null}
          <MetricList titleText={title(dashboard)} items={dashItems[dashboard]}/>
        </>:null}

        {/* ── IDEAS ── */}
        {tab==='ideas'?<>{ideas.map(idea=>{const next:Partial<Record<IdeaStatus,IdeaStatus>>={backlog:'planned',researching:'planned',planned:'building',building:'testing',testing:'shipped'};return <View key={idea.id} style={s.card}><Text style={s.severity}>{idea.status}</Text><Text style={s.cardTitle}>{idea.title}</Text>{idea.notes?<Text style={s.body}>{idea.notes}</Text>:null}{next[idea.status]?<TouchableOpacity style={s.primary} onPress={()=>void advance(idea.id,next[idea.status]!)}><Text style={s.primaryText}>Move to {next[idea.status]}</Text></TouchableOpacity>:null}</View>;})}</>:null}

        {/* ── REDTEAM ── */}
        {tab==='redteam'?<>

          {/* ─ OODA: OBSERVE ─ */}
          <View style={s.panel}>
            <Text style={s.kicker}>OBSERVE</Text>
            <View style={s.heroStats}>
              <View style={s.stat}>
                <Text style={[s.statNum,{color:criticalCount>0?'#fb7185':'#4ade80'}]}>{criticalCount}</Text>
                <Text style={s.muted}>critical</Text>
              </View>
              <View style={s.stat}>
                <Text style={s.statNum}>{active.length}</Text>
                <Text style={s.muted}>open issues</Text>
              </View>
              <View style={s.stat}>
                <Text style={[s.statNum,{color:errorDelta>0?'#fb923c':'#4ade80'}]}>{errorDelta>0?`+${errorDelta}`:errorDelta}</Text>
                <Text style={s.muted}>error delta</Text>
              </View>
            </View>
            <Text style={s.muted}>Top crash: {analytics.crashes[0]?.label??'—'} · AI cost today: ${aiCost.toFixed(2)}</Text>
            <Text style={[s.muted,{marginTop:6}]}>Top adoption: {adoptionTop}</Text>
          </View>

          {/* ─ OODA: ORIENT ─ */}
          <View style={[s.panel,{borderColor:signal.color+'40'}]}>
            <Text style={[s.kicker,{color:signal.color}]}>ORIENT — {signal.label}</Text>
            <Text style={[s.body,{marginTop:8}]}>{signal.body}</Text>
          </View>

          {/* ─ OODA: DECIDE ─ */}
          <View style={s.panel}>
            <Text style={s.kicker}>DECIDE</Text>
            <Text style={[s.muted,{marginBottom:8}]}>What is the call right now?</Text>
            <TextInput
              value={decideMemo}
              onChangeText={setDecideMemo}
              multiline
              style={[s.input,{minHeight:80,textAlignVertical:'top'}]}
              placeholder="one clear decision…"
              placeholderTextColor="#6b7280"
            />
          </View>

          {/* ─ OODA: ACT ─ */}
          <View style={s.panel}>
            <Text style={s.kicker}>ACT</Text>
            <TouchableOpacity
              style={[s.primary,{marginTop:8}]}
              onPress={()=>{
                void AsyncStorage.setItem(OODA_KEY,decideMemo);
                setTab(signal.route);
              }}
            >
              <Text style={s.primaryText}>
                {criticalCount>0
                  ? `Open Issues — ${criticalCount} critical to resolve`
                  : errorDelta>5
                  ? 'Open Releases — regression watch'
                  : aiCost>50
                  ? 'Open Dashboards — cost review'
                  : 'Open Overview — Lindy check'}
              </Text>
            </TouchableOpacity>
            {decideMemo.trim()?<Text style={[s.muted,{marginTop:8}]}>Decision saved to session.</Text>:null}
          </View>

          {/* ─ DIVIDER ─ */}
          <View style={{height:1,backgroundColor:'#272238',marginVertical:12}}/>

          {/* ─ LINDYMODE ─ */}
          <View style={s.panel}>
            <Text style={s.kicker}>LINDYMODE</Text>
            <Text style={[s.panelTitle,{marginBottom:8}]}>What are you red-teaming?</Text>
            <TextInput
              value={lindyTarget}
              onChangeText={v=>{setLindyTarget(v);setLindyAnswers({});}}
              style={s.input}
              placeholder="feature, screen, or system name…"
              placeholderTextColor="#6b7280"
            />
            {lindyTarget.trim()?LINDY_CHECKS.map(check=>(
              <View key={check.id} style={{flexDirection:'row',alignItems:'center',gap:12,marginBottom:10}}>
                <TriToggle
                  value={lindyAnswers[check.id]??null}
                  onChange={v=>setLindyAnswers(prev=>({...prev,[check.id]:v}))}
                  accent="#a78bfa"
                />
                <Text style={[s.body,{flex:1}]}>{check.q}</Text>
              </View>
            )):null}
            {lindyVerdict?(
              <View style={{marginTop:14,borderTopWidth:1,borderTopColor:'#272238',paddingTop:14}}>
                <Text style={[s.kicker,{color:lindyVerdict.color}]}>{lindyVerdict.label}</Text>
                <Text style={[s.body,{marginTop:6}]}>{lindyVerdict.body}</Text>
              </View>
            ):null}
          </View>

          {/* ─ DIVIDER ─ */}
          <View style={{height:1,backgroundColor:'#272238',marginVertical:12}}/>

          {/* ─ L99 PLACEMENT GUARD ─ */}
          <View style={s.panel}>
            <Text style={s.kicker}>L99 PLACEMENT GUARD</Text>
            <Text style={[s.panelTitle,{marginBottom:8}]}>Where does this live?</Text>
            <TextInput
              value={placementTarget}
              onChangeText={v=>{setPlacementTarget(v);setL99Answers({});}}
              style={s.input}
              placeholder="what are you placing? e.g. 'OODA panel', 'chart'…"
              placeholderTextColor="#6b7280"
            />
            {placementTarget.trim()?L99_QUESTIONS.map(q=>(
              <View key={q.id} style={{flexDirection:'row',gap:12,marginBottom:10,alignItems:'center'}}>
                <TriToggle
                  value={l99Answers[q.id]??null}
                  onChange={v=>setL99Answers(prev=>({...prev,[q.id]:v}))}
                  accent="#6d28d9"
                />
                <Text style={[s.body,{flex:1}]}>{q.q}</Text>
              </View>
            )):null}
            {l99Verdict?(
              <View style={{marginTop:12,borderTopWidth:1,borderTopColor:'#272238',paddingTop:12}}>
                <Text style={[s.kicker,{color:l99Verdict.color}]}>{l99Verdict.label}</Text>
                <Text style={[s.body,{marginTop:6}]}>{l99Verdict.body}</Text>
                {l99Yes>=3?(
                  <Text style={[s.guardItem,{marginTop:8}]}>✓ {CONTROL_ROOM_ENTRY_ROUTE} → {CONTROL_ROOM_SCREEN_ENTRY}</Text>
                ):(
                  CONTROL_ROOM_FORBIDDEN_PATHS.map(p=><Text key={p} style={s.guardBad}>✕ {p}</Text>)
                )}
              </View>
            ):null}
          </View>

          {/* ─ DIVIDER ─ */}
          <View style={{height:1,backgroundColor:'#272238',marginVertical:12}}/>

          {/* ─ Static reference zones ─ */}
          <View style={s.panel}>
            <Text style={s.panelTitle}>Allowed build zones</Text>
            {CONTROL_ROOM_ALLOWED_PATHS.map(path=><Text key={path} style={s.guardItem}>✓ {path}</Text>)}
          </View>
          <View style={s.panel}>
            <Text style={s.panelTitle}>Blocked parallel systems</Text>
            {CONTROL_ROOM_FORBIDDEN_PATHS.map(path=><Text key={path} style={s.guardBad}>✕ {path}</Text>)}
          </View>
          <View style={s.panel}>
            <Text style={s.panelTitle}>Red-team checks before adding capability</Text>
            {CONTROL_ROOM_PLACEMENT_RULES.map(rule=><Text key={rule} style={s.guardItem}>• {rule}</Text>)}
          </View>

        </>:null}

      </ScrollView>
      <IssueDetail issue={selected} onClose={()=>setSelected(null)} onChanged={load}/>
    </View>
  );
}

const s=StyleSheet.create({root:{flex:1,backgroundColor:'#080611'},header:{paddingTop:58,paddingHorizontal:20,paddingBottom:14},headerTop:{flexDirection:'row',alignItems:'flex-start'},linkBtn:{borderWidth:1,borderColor:'#2b2540',backgroundColor:'#12101c',paddingHorizontal:13,paddingVertical:9,borderRadius:999,marginTop:6},linkBtnText:{color:'#a7a1b7',fontWeight:'700',fontSize:12},kicker:{color:'#a78bfa',fontWeight:'800',fontSize:11,letterSpacing:2},headerTitle:{color:'#fff',fontWeight:'900',fontSize:30,marginTop:4},tabs:{maxHeight:54,paddingHorizontal:16},scroll:{flex:1},content:{padding:16,paddingBottom:80},chip:{borderWidth:1,borderColor:'#2b2540',backgroundColor:'#12101c',paddingHorizontal:13,paddingVertical:9,borderRadius:999,marginRight:8,marginBottom:8},chipOn:{backgroundColor:'#6d28d9',borderColor:'#a78bfa'},chipText:{color:'#a7a1b7',fontWeight:'700',fontSize:12},chipTextOn:{color:'#fff'},heroStats:{flexDirection:'row',gap:10,marginBottom:12},stat:{flex:1,backgroundColor:'#12101c',borderWidth:1,borderColor:'#272238',borderRadius:16,padding:14},statNum:{color:'#a78bfa',fontSize:23,fontWeight:'900'},panel:{backgroundColor:'#12101c',borderWidth:1,borderColor:'#272238',borderRadius:18,padding:16,marginBottom:12},panelTitle:{color:'#fff',fontWeight:'800',fontSize:16,marginBottom:12},bigMoney:{color:'#4ade80',fontWeight:'900',fontSize:34},muted:{color:'#8f899e',fontSize:12,lineHeight:18},section:{color:'#fff',fontWeight:'800',fontSize:15,marginTop:16,marginBottom:8},input:{backgroundColor:'#12101c',borderColor:'#332c48',borderWidth:1,borderRadius:12,padding:12,color:'#fff',marginBottom:10},notes:{minHeight:110,textAlignVertical:'top'},primary:{backgroundColor:'#6d28d9',borderRadius:12,paddingHorizontal:14,paddingVertical:11,alignItems:'center',marginBottom:10},primaryText:{color:'#fff',fontWeight:'800'},saveRow:{flexDirection:'row',gap:8,alignItems:'flex-start',marginTop:14},result:{color:'#a78bfa',fontWeight:'800',marginVertical:12},card:{backgroundColor:'#12101c',borderColor:'#272238',borderWidth:1,borderRadius:16,padding:15,marginBottom:10},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},cardTitle:{color:'#fff',fontWeight:'800',fontSize:16,marginVertical:7},severity:{fontWeight:'900',fontSize:11,textTransform:'uppercase',color:'#a78bfa'},health:{color:'#c4b5fd',fontWeight:'800',textTransform:'uppercase',fontSize:11},body:{color:'#c8c3d2',fontSize:13,lineHeight:19},statsRow:{flexDirection:'row',gap:12,marginTop:10},smallStat:{color:'#c4b5fd',fontSize:12,fontWeight:'700'},delta:{color:'#8f899e',fontSize:11,marginTop:8},recovery:{color:'#c4b5fd',fontSize:12,lineHeight:18,marginTop:8},metricRow:{marginBottom:12},metricTop:{flexDirection:'row',justifyContent:'space-between'},metricLabel:{color:'#d7d2df',fontSize:12},metricValue:{color:'#a78bfa',fontWeight:'800'},bar:{height:7,backgroundColor:'#29233a',borderRadius:99,overflow:'hidden',marginTop:6},barFill:{height:7,backgroundColor:'#8b5cf6',borderRadius:99},center:{flex:1,backgroundColor:'#080611',alignItems:'center',justifyContent:'center',padding:24,gap:14},lock:{fontSize:36},modal:{flex:1,backgroundColor:'#080611'},modalBody:{padding:22,paddingTop:48,paddingBottom:60},modalTitle:{color:'#fff',fontSize:25,fontWeight:'900',marginVertical:10},info:{backgroundColor:'#12101c',borderRadius:14,padding:14,marginTop:14},infoText:{color:'#bcb6c8',fontSize:12,marginBottom:6},wrap:{flexDirection:'row',flexWrap:'wrap'},history:{borderLeftWidth:2,borderLeftColor:'#6d28d9',paddingLeft:12,paddingBottom:14},historyTitle:{color:'#fff',fontWeight:'800'},historyDate:{color:'#6b7280',fontSize:10,marginTop:3},close:{backgroundColor:'#312e81',borderRadius:12,padding:14,alignItems:'center',marginTop:20},guardItem:{color:'#c8c3d2',fontSize:12,lineHeight:19,marginBottom:6},guardBad:{color:'#fb7185',fontSize:12,lineHeight:19,marginBottom:6,fontWeight:'800'},disabled:{opacity:.45},runResult:{borderTopWidth:1,borderTopColor:'#272238',marginTop:10,paddingTop:10},output:{backgroundColor:'#080611',color:'#d7d2df',fontFamily:'monospace',fontSize:11,lineHeight:16,padding:10,borderRadius:10,marginTop:8}});
