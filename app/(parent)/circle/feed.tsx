import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { navigateTo } from '@/utils/navigation';
import { useVerificationContext } from '@/context/VerificationContext';
import { isGuardianVerified } from '@/services/verificationState';
import {
  loadParentCommunityFeed,
  createParentCommunityPost,
  reactToParentCommunityPost,
  replyToParentCommunityPost,
  reportParentCommunityPost,
  type ParentCommunityPost,
  type ParentCommunityErrorCode,
} from '@/utils/sync';
import { ParentCircleScreen } from '@screens/ParentCircleScreen';
import type { ParentCirclePost } from '@/types';

// Parent Community: real backend wiring (RPC-only, see sync.ts). Distinct
// from the legacy local-only parentCirclePosts flow in AppContext, which this
// screen no longer reads from - that table isn't the real community feed and
// its ids are never UUIDs the new RPCs can accept.

function communityToLocal(posts: ParentCommunityPost[]): ParentCirclePost[] {
  return posts.map(p => ({
    id: p.id,
    text: p.text,
    date: new Date(p.createdAt).toLocaleDateString(),
    time: new Date(p.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    circleTag: p.circleTag,
    reactions: p.reactions,
    quietRepliesCount: p.quietRepliesCount,
  })) as unknown as ParentCirclePost[];
}

const ERROR_COPY: Record<ParentCommunityErrorCode, string> = {
  authentication_required: 'Please sign in again to use Parent Circle.',
  permanent_account_required: 'Parent Circle needs a permanent signed-in account.',
  verified_guardian_required: "You'll need to finish guardian verification first.",
  invalid_parent_community_post: "That post is too long or empty - try shortening it.",
  invalid_parent_community_tag: 'That topic tag is too long.',
  invalid_parent_community_reaction: "That reaction didn't go through - try again.",
  invalid_parent_community_reply: 'That reply is too long or empty.',
  parent_community_post_not_found: 'That post is no longer available.',
  parent_community_circle_unavailable: "Couldn't reach Parent Circle right now.",
  unknown: 'Something went wrong. Please try again.',
};

export default function ParentCircleRoute() {
  const { verificationState, isVerificationLoading } = useVerificationContext();
  const verified = isGuardianVerified(verificationState);

  const [posts, setPosts] = useState<ParentCommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerText, setComposerText] = useState('');

  const refreshFeed = useCallback(async () => {
    if (!verified) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await loadParentCommunityFeed();
    if (result.ok) setPosts(result.data);
    setLoading(false);
  }, [verified]);

  useEffect(() => {
    if (isVerificationLoading) return;
    void refreshFeed();
  }, [isVerificationLoading, refreshFeed]);

  async function handleSavePost(extra?: Partial<ParentCirclePost>): Promise<boolean> {
    const text = (extra?.text ?? composerText).trim();
    if (!text) return false;
    const result = await createParentCommunityPost(text, extra?.circleTag);
    if (!result.ok) {
      Alert.alert('Could not post', ERROR_COPY[result.code]);
      return false;
    }
    setPosts(prev => [result.data, ...prev]);
    return true;
  }

  async function handleReact(id: string | number, type: string): Promise<void> {
    const postId = String(id);
    const result = await reactToParentCommunityPost(postId, type);
    if (!result.ok) {
      Alert.alert('Could not react', ERROR_COPY[result.code]);
      return;
    }
    setPosts(prev => prev.map(p => (p.id === postId ? { ...p, reactions: result.data } : p)));
  }

  async function handleReplySubmit(postId: string, body: string): Promise<void> {
    const result = await replyToParentCommunityPost(postId, body);
    if (!result.ok) {
      Alert.alert('Could not send reply', ERROR_COPY[result.code]);
      return;
    }
    setPosts(prev => prev.map(p => (p.id === postId ? { ...p, quietRepliesCount: result.data } : p)));
  }

  async function handleReportPost(id: string | number): Promise<void> {
    const result = await reportParentCommunityPost(String(id));
    if (!result.ok) {
      Alert.alert('Could not report post', ERROR_COPY[result.code]);
    }
  }

  if (isVerificationLoading || loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color="#d97706" />
      </View>
    );
  }

  if (!verified) {
    return (
      <View style={s.center}>
        <Text style={s.gateEmoji}>🔒</Text>
        <Text style={s.gateTitle}>Parent Circle is for verified guardians</Text>
        <Text style={s.gateBody}>
          Finish guardian verification to post and react anonymously with other parents.
        </Text>
        <TouchableOpacity
          style={s.gateBtn}
          onPress={() => router.push('/(auth)/guardian-verification' as never)}
        >
          <Text style={s.gateBtnText}>Verify now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ParentCircleScreen
      parentCirclePosts={communityToLocal(posts)}
      parentCirclePostText={composerText}
      setParentCirclePostText={setComposerText}
      saveParentCirclePost={handleSavePost}
      reactToParentPost={handleReact}
      onReplySubmit={handleReplySubmit}
      onReportPost={handleReportPost}
      setScreen={navigateTo}
      BottomNav={null}
    />
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#0a1a14', alignItems: 'center', justifyContent: 'center', padding: 28 },
  gateEmoji: { fontSize: 40, marginBottom: 12 },
  gateTitle: { color: '#f5f0e8', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  gateBody: { color: '#a3b899', fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 22 },
  gateBtn: { backgroundColor: '#d97706', borderRadius: 18, paddingHorizontal: 22, paddingVertical: 12 },
  gateBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
