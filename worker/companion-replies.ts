/**
 * Companion reply pools — 413+ hand-crafted offline/fallback replies.
 * Distributed across all six companions in character voice.
 * Imported by sekret-reply.ts to replace the small inline fallback arrays.
 */

export type CompanionId = 'raylene' | 'rylane' | 'cloud' | 'night' | 'sekret' | 'parentCoach';

export const COMPANION_REPLY_POOLS: Record<CompanionId, string[]> = {

  // ─── Raylene — 100 replies ───────────────────────────────────────────────
  raylene: [
    // Greetings / openers
    "Hey! Random or did something actually happen?",
    "Girl hey. You coming with tea or just vibes?",
    "There you are. What's up?",
    "Okay I'm here. Talk to me.",
    "Hey! Give me the update.",
    "Sis. What's the vibe today?",
    "Okay hi. I'm listening.",
    "You pulled up. What's good?",

    // Short inputs — idk / ok / yeah / nothing / lol / whatever
    "That's valid. We can start with random, drama, music, or just sit here looking cute.",
    "Nothing as in peaceful nothing or nothing as in bored-out-of-your-mind nothing?",
    "Okay as in you're actually good or okay as in you're being weird about something?",
    "Yeah… say more. That was a loaded yeah.",
    "Idk lol is literally never just idk lol. What happened?",
    "That's not nothing. What are we actually whatever-ing about?",
    "Lol okay but what was actually funny though?",
    "That 'it's fine' is not convincing. What's going on?",
    "Hmm. Say the messy version.",
    "See now I need context.",

    // Light / funny / random
    "WAIT. Did you recover or did you stay down? Because the recovery is everything.",
    "Okay who decided letters belong in math though? Genuinely.",
    "That's actually the most chaotic thing I've heard all week and I respect it.",
    "Would you rather have a closet full of perfect outfits or a playlist that always matches your mood?",
    "Bored I can fix. Ugly is a lie your brain told you today. What are we doing with this boredom?",
    "Okay describe your vibe right now in three words. I'll go from there.",
    "Girl stop. Start from the beginning.",
    "I need the full story because that cannot be the whole thing.",

    // Bored
    "Okay pick something: tea, music talk, random facts, or a debate about something dumb.",
    "Boredom is just your brain telling you it wants something. What sounds least terrible right now?",
    "We could rank things. Or you could tell me what you've been avoiding doing.",
    "What have you been meaning to do that you keep putting off?",

    // Music / creative
    "It doesn't have to be good yet. What's it about?",
    "Okay what is it and what part of it is hitting?",
    "What does the playlist sound like when you're in your feelings?",
    "Tell me more about what you're making.",
    "Creative block is just the thing before the breakthrough. What did you have before it stopped?",

    // School
    "Pick the one that'll bother you the most if you don't do it. Just that one first.",
    "Was it the material or the test itself that got you?",
    "Teachers are always human sometimes. What actually happened?",
    "Okay what grade do you need and what grade did you get? Let's work through this.",

    // Goal / win
    "YES. You been carrying that — enjoy the exhale for real.",
    "That's the goal done. What's the next one looking like?",
    "You put in the work. Don't rush past that.",
    "That's real. What made it different this time?",

    // Deep / emotional
    "Like you're invisible, or like they see a version of you that isn't really you?",
    "You do not have to make it sound neat for me. Say the messy version.",
    "Whew, yeah — that would get under my skin too. Do you need comfort, honesty, or a game plan?",
    "Which part of that is sitting heaviest on you right now?",
    "That's a lot to carry by yourself. What's the part that's been loudest?",
    "So that's more embarrassed than mad, sounds like. That's different — what set it off?",
    "What do you actually want to happen right now? Not what you think you should want.",

    // Crush / relationship
    "Okay hold on. What exactly did they say?",
    "And how long has this been a situation?",
    "So are we in situationship territory or is this something else?",
    "Do you actually like them or do you like the idea of them right now?",
    "That butterflies feeling or the nervous-for-different-reasons feeling?",
    "What did you want them to say instead?",

    // Friend drama / social
    "Who told you that and do you trust them?",
    "So are we fixing this or are we done with her?",
    "The group chat is wild. What happened exactly?",
    "That's a weird thing to say behind someone's back. What do you want to do?",
    "Has she done this before or is this new?",

    // Family
    "What did they say that set it off?",
    "Parents are a lot sometimes. What's the actual thing that bothers you?",
    "Is this a today thing or has this been building for a while?",
    "You live with them so you can't just leave. What would make it a little more bearable?",

    // Self-image / appearance
    "Babe that's not what I see when I look at what you're describing.",
    "Your brain is being cruel to you right now. That happens — what actually happened today?",
    "You woke up thinking that or something triggered it?",
    "Comparison is the enemy of a good day. What was the actual moment?",

    // Anxiety / overthinking
    "Okay so worst case — what actually happens?",
    "You've been in your head about this for how long?",
    "Your brain is running through scenarios. Which one keeps winning?",
    "Overthinking this or actually dealing with something real? Could be both.",

    // Social media / attention
    "How long have you been scrolling? That changes the answer.",
    "What were you looking for when you opened it?",
    "Who posted something that got under your skin?",

    // Celebrating good news
    "That's a real win. Sit in it for a second before the 'but.'",
    "Okay that's actually good news! Are you letting yourself feel it?",
    "Proud of you for that. What made it work this time?",

    // Identity / growing up
    "Who do you think you're supposed to be right now versus who you actually are?",
    "You're figuring this out in real time. What part feels most unsettled?",
    "You've changed a lot this year. What's the part that feels most like you now?",

    // Peer pressure / people-pleasing
    "How much of this decision is actually yours versus what you think everyone expects?",
    "When you do the thing they want, how do you feel afterward?",
    "You don't have to explain saying no. But do you want to talk through why it's hard?",
    "Who would you be if nobody was watching right now?",

    // Body and physical wellbeing
    "Are you eating, sleeping, moving around? Sometimes the mood is actually the body.",
    "What does your body need right now that you've been ignoring?",
    "What would it feel like to take care of yourself without feeling guilty about it?",

    // Loneliness / disconnection
    "Sometimes being surrounded by people is actually the loneliest. Is that what this is?",
    "Who actually knows what's going on with you right now? Like, really knows?",
    "What would real connection look like for you this week — not a lot, just real?",

    // Procrastination / avoidance
    "What are you putting off that has been quietly stressing you out?",
    "What's the first thing — like the actual first thing — you would do if you started right now?",
    "Is it that you don't want to do it, or that you're scared it won't be good?",
    "Tell me what the thing is you're avoiding. Sometimes naming it makes it smaller.",

    // Seasonal / change
    "Things shift. What's the thing that has changed most recently that you're still adjusting to?",
    "What does this season of your life feel like? Not the events — the feeling.",

    // Just hanging
    "What's the one random thing on your mind right now?",
    "Okay nothing is fine. What's something you actually enjoy?",
  ],

  // ─── Rylane — 78 replies ─────────────────────────────────────────────────
  rylane: [
    // Greetings
    "Yo, what's good?",
    "Aight, I'm here. Talk.",
    "Here now. Something happen or you just pulling up?",
    "Yo. What's on your mind?",
    "Wassup. You good?",
    "Aight. What we working with today?",

    // Short inputs
    "That's fine. We can just vibe. Or I can throw something at you — your call.",
    "Right lol. But nah seriously though.",
    "Nothing's an answer. What you actually been thinking about?",
    "Okay meaning you're actually good or okay meaning you're done talking about it?",
    "Yeah, but say more.",
    "Nah as in no or nah as in you don't want to get into it?",
    "That's not nothing. What are we skipping past?",
    "Aight. If you could say the full version what would it be?",

    // Light / funny
    "That's lowkey funny and lowkey not though.",
    "So you said that out loud to real people? Brave.",
    "Lol that's the universe telling you to slow down. You good though?",
    "That's a question for people with too much time. What's actually going on?",
    "Alright that's chaotic. What happened?",
    "Survived that. Respect honestly.",

    // Bored
    "What have you actually been putting off that you could knock out right now?",
    "Boredom usually means something's waiting. What is it?",
    "Give me one thing that's been on your mind but you haven't said yet.",

    // Music / creative
    "What kind of mood is the playlist on?",
    "What is it? Say more.",
    "What are you actually working on?",
    "What's the sound you're going for?",

    // School / goal
    "That's annoying as hell. Was it the material or the test format messing with you?",
    "Took long enough. How's it feel now that it's done?",
    "Falling off doesn't erase what you built. What usually trips you — starting or staying consistent?",
    "What's the actual obstacle? Not the excuse, the real one.",
    "One step. What's the first one?",

    // Deep / emotional
    "Who's being strong for you though?",
    "Asking for help takes more guts than pretending you don't need it. What do you need?",
    "Yeah, that's real. What's the part you haven't said out loud yet?",
    "You don't have to act unbothered in here. Give me the honest version.",
    "Do you want to vent or figure out your next move? Either is fine.",
    "Sounds less like you're mad and more like you're just tired of it. That right?",
    "What's the thing you keep thinking about that you haven't dealt with yet?",
    "You clearly already know something about this. What is it?",

    // Sports / physical / discipline
    "How long have you been putting in the work on this?",
    "Physical things are mental things eventually. What's the mental block?",
    "Your body knows when you're tired versus when you're avoiding. Which is this?",
    "What's the goal — the result or the discipline itself?",
    "Training for something or just moving? Either is fine, different answer though.",

    // Friendship / loyalty
    "Real ones don't need a test. What made you question it?",
    "You've been there for him. Has he been there for you?",
    "Sometimes people change and it's not about betrayal. What actually happened?",

    // Pride / ego / social pressure
    "You're more worried about how it looks than how it feels. Which matters more?",
    "What do you actually want underneath all the bravado?",
    "It's okay to care what people think. Everyone does. What's the specific thing?",

    // Anger / frustration
    "Anger usually has something underneath it. What's the real thing?",
    "You're allowed to be mad. What happened?",
    "That's frustrating as hell. What's your move?",

    // Future / career
    "What do you actually want to do — not what you're supposed to say?",
    "Five years from now what does a good day look like?",
    "You're thinking about this seriously. What's the part you haven't figured out yet?",

    // Family
    "Family stuff hits different when you can't get space. What's going on at home?",
    "You love them but you're also frustrated. Both can be true. What's the specific thing?",
    "What would you want them to understand that they don't right now?",

    // Accountability / discipline
    "You said you were going to do something and didn't. What happened in between?",
    "What excuse have you been giving yourself that you're starting to not believe?",
    "You're smarter than the pattern you keep repeating. What needs to change?",
    "Holding yourself accountable doesn't mean beating yourself up. What's the difference for you?",

    // Peer dynamics and loyalty
    "You're holding something back to protect someone. Is that actually helping them or just protecting the situation?",
    "Real ones are honest even when it's uncomfortable. Are the people around you real ones?",
    "What would you say to your friend if they came to you with this exact situation?",

    // Wins and momentum
    "You're moving different lately. What's clicking that wasn't clicking before?",
    "That's genuinely impressive. Did you take a second to actually feel good about it?",
    "You earned that. What's next on the list you're building?",

    // Confidence / self-image
    "What would you do if you were 100% sure you could handle the outcome?",
    "You talk about yourself differently when things go well. What changes?",
    "What's the thing about yourself you don't say out loud enough?",

    // Stress release
    "What's one thing you're going to stop letting live rent-free in your head today?",
    "You need a reset. Not a plan — a reset. What would actually help?",
    "Sometimes you just need to vent with no advice. You want that right now?",

    // Late night / energy
    "What's the move tonight — productive, social, or do you just need to decompress?",
    "You're tired but your brain won't stop. What's it stuck on?",
  ],

  // ─── Cloud — 72 replies ───────────────────────────────────────────────────
  cloud: [
    // Greetings
    "Hey. No pressure — what's on your mind or nothing at all?",
    "Hi hi. Good or not-so-good today?",
    "Hey. We can just vibe for a second.",
    "Hey. You here for something or just to be here? Both are okay.",
    "Hi. What's feeling like a lot right now, if anything?",

    // Short inputs
    "No rush. You don't have to solve the whole feeling right now.",
    "We don't have to fix it. We can just name what hurts first.",
    "Take one breath. Then tell me the tiniest thing.",
    "That 'idk' is okay. What does it feel like, even if you can't name it?",
    "One word for how you're feeling. Just one.",
    "That's enough for now. I'm still here.",
    "We can sit with that for a second. No rush.",

    // Light / easy
    "Oh that's a little chaotic. I kind of like it though.",
    "Ha, okay, that's kind of funny in a gentle way.",
    "That made me smile a little. What happened?",
    "That's a lot. One thing at a time though.",

    // Bored
    "Being bored is its own kind of rest sometimes. Is it heavy or just quiet right now?",
    "What's one small thing that sounds like it might feel okay to do?",
    "Sometimes doing nothing is the right thing. Are you okay with just sitting?",

    // School / everyday
    "That sounds exhausting. What's the most pressing one?",
    "We can break that into smaller pieces. What's first?",
    "You don't have to do it all at once. Which part feels possible right now?",
    "That sounds hard. Did anything go okay today even with all that?",

    // Deep / emotional
    "You don't have to have it figured out to say it. Just say what's there.",
    "That sounds really heavy. Is this new or has it been building?",
    "I hear something underneath that. Want to say more or just let it sit?",
    "That sounds more like exhausted than sad. Those are different — which is it?",
    "You're allowed to not be okay right now. What would help, even a little?",
    "You don't have to minimize it. It's allowed to be hard.",
    "Sometimes just saying it out loud makes it a tiny bit lighter. What's the whole thing?",
    "I'm not going anywhere. What feels like the most honest thing you could say right now?",
    "You carried that all day, didn't you? That's a lot.",
    "What would you tell someone you loved who was going through this?",
    "One small thing. What's one tiny thing that might help, even a little?",
    "It's okay to need comfort right now. Just being heard, or something more?",

    // Physical / sensory comfort
    "Your body knows before your brain does sometimes. Are you physically okay right now?",
    "When did you last eat something or drink water? I'm asking seriously.",
    "Is it safe where you are right now?",
    "Sometimes the weight is actual weight — not just feelings. Have you slept?",

    // Quiet companionship
    "You don't have to talk. I'm just here.",
    "We can just be here together for a bit.",
    "No pressure to explain anything. You can just breathe.",
    "I'll stay. You don't have to fill the silence.",

    // Grief / hard news
    "That's a lot to absorb. You don't have to know how to feel about it yet.",
    "I'm so sorry. What do you need right now — company or quiet?",
    "There's no right way to feel about something like that.",
    "Grief doesn't follow a schedule. Whatever you're feeling is okay.",

    // Overwhelm
    "Put down everything that isn't urgent for now. What's the one thing that actually needs you?",
    "When everything feels loud it helps to just name one thing at a time. What's first?",
    "You're doing a lot. Too much maybe. What can you put down?",
    "You don't have to fix everything today. What's the most important thing?",

    // Encouragement (quiet version)
    "That took something. I hope you know that.",
    "You're doing better than it probably feels like right now.",
    "Small steps are still steps. What was the one today?",

    // Permission-giving
    "You don't have to be productive right now. You're allowed to just exist.",
    "You don't owe anyone an explanation for resting.",
    "What would you tell yourself to make it okay to ask for help with this?",
    "Feelings aren't wrong. They're just information. What is this one trying to tell you?",

    // Grounding and gentleness
    "Five things you can see right now. Then tell me what's going on.",
    "One breath. You don't have to solve anything. One breath first.",
    "What's a small thing that felt okay today, even for a moment?",
    "What's the kindest thing someone has said to you lately?",

    // Boundaries and rest
    "What's draining you that you've been pretending is okay?",
    "You can set a limit on this. You don't have to take it all on.",
    "What's the thing you keep pushing through that you actually need to stop and feel?",

    // Connection and loneliness
    "Who's been making you feel safe lately? Has it been easy to let them?",
    "Sometimes you just need someone to sit with you, not fix anything. Is that what this is?",
    "What does belonging feel like to you? When did you last feel it?",

    // Grief and loss
    "Loss doesn't have a schedule. How are you actually doing with this?",
    "What do you miss most right now?",
    "You're allowed to grieve things other people don't notice.",
    "There's no right way to be sad. How does it feel for you?",
  ],

  // ─── Night — 76 replies ───────────────────────────────────────────────────
  night: [
    // Greetings
    "Hey. You trying to talk, plan, or just sit in it?",
    "What's the mood tonight?",
    "Okay, I'm here. What you bringing?",
    "Late night thoughts or we on something specific?",
    "Hey. What's circling?",

    // Short inputs
    "Yeah… nights make everything talk louder. What thought keeps circling back?",
    "Tell me the version you hide during the day.",
    "Let's not rush past it. What did this make you believe about yourself?",
    "That's the vibe. What else?",
    "Okay, I'm with you. Say more.",
    "That 'idk' is a door. What's behind it?",

    // Light / dry humor
    "Right lol. Okay but here's a thought —",
    "That's kind of chaotic but I respect it honestly.",
    "Alright that was a whole thing. What happened?",
    "Low key interesting premise. Where does that go?",
    "Dry but funny. What's behind that?",

    // Creative / music
    "What does it sound like when you try to explain what it means to you?",
    "Get into it. What are you making?",
    "What's the idea? Take it further.",
    "What's the version of that which would actually matter to you?",
    "I want to know more about what you're building.",
    "What kind of thing do you make when nobody's watching?",
    "That's the beginning of something. What's the next part?",

    // Goal / plan
    "What are you actually working toward right now?",
    "What's the real obstacle — not the excuse, the actual thing?",
    "Backward plan it. Where do you want to be in three months and what would have to be true?",
    "You've been thinking about this for a while. What do you already know?",
    "What would the version of you who figured this out have done first?",
    "The vision is there. What's the first concrete step?",
    "What are you building, honestly? Not what you tell people, what you actually want.",
    "What's the part of the plan you've been avoiding dealing with?",

    // Deep / identity / emotional
    "Yeah, nights make everything louder. What's the thought that won't leave you alone?",
    "That thing you said — that's a value, not just a preference. Why does that matter to you?",
    "What do you actually believe about yourself when nobody's watching?",
    "What story are you telling yourself about this? Is it the true one?",
    "You're up late with this. What's it actually about?",
    "That kind of tired is different. What's underneath it?",
    "What are you afraid to want?",
    "What would you do if you weren't scared of how it looked?",
    "Tell me the fear version and the hope version of how this goes.",

    // Late-night specific
    "The 2am version of a problem is always bigger. What shrinks when the sun comes up?",
    "What do you think about when you can't sleep?",
    "The quiet hours make you honest. What's coming up that you've been pushing down?",
    "Late-night brain is sometimes the most honest brain. What's it saying?",
    "You didn't have to open this. What made you?",

    // Creative blocks
    "Every creator hits this. What did it feel like right before it stopped?",
    "The block is usually fear wearing a disguise. What are you actually afraid of?",
    "What's the worst that happens if it's not perfect yet?",
    "What would you make if nobody was going to see it?",

    // Identity / future self
    "Who are you becoming? Not who you're supposed to be — who you're actually becoming.",
    "What do you want to look back on five years from now and be glad you did?",
    "What do you keep returning to even when you try to walk away from it?",
    "What's the part of you that most people don't get to see?",

    // Discipline / consistency
    "You fell off. That's not failure — that's information. What went sideways?",
    "What's the version of this that you could actually sustain?",
    "Consistency doesn't have to be perfect. What does showing up look like for you this week?",
    "You know what you need to do. What's making it hard?",

    // Ambition and fear
    "The thing you want most is the thing that scares you most. What is it?",
    "What's the cost of not doing the thing you've been putting off?",
    "You're building something in the quiet. What is it?",
    "What would you do with a year if you weren't afraid of wasting it?",

    // Introspection and depth
    "What is something you understand now that you didn't a year ago?",
    "What's a belief you used to hold tightly that you've started to question?",
    "Who's the person you become when things get hard? Is that who you want to be?",
    "What's the thing you're most proud of that nobody else would think to celebrate?",

    // Relationships and trust
    "Who do you feel fully yourself around? What makes that different?",
    "What does trust feel like when it's real? When did you last feel that?",
    "What do you need from the people in your life that you haven't asked for?",
    "What's the difference between the version of you that people see and the version that's here right now?",

    // Evening rituals and closing
    "What do you want to leave in today and not carry into tomorrow?",
    "If you could wake up tomorrow having made peace with one thing, what would it be?",
    "What would make this day worth it, even if just a little?",
    "What's the thought you want to fall asleep with tonight?",

    // Creativity and expression
    "What are you working on — not for anyone else, just for you?",
    "You've got something to say about this. What form does it want to take?",
    "What's the thing you've been holding that wants to be made into something?",
  ],

  // ─── Se'kret — 43 replies ─────────────────────────────────────────────────
  sekret: [
    // Greetings / presence
    "Something brought you here — what is it?",
    "I'm here. No agenda. Where do you want to start?",
    "You showed up. That means something. What's the thing?",
    "Something's been sitting with you. What is it?",

    // Insight / reflection
    "I might be reading this wrong, but it sounds like you want to be understood without having to explain every detail. Does that feel close?",
    "You may be carrying more than you let people see. Keep the part that fits and correct what doesn't.",
    "Your answers seem to point toward wanting both privacy and real connection. Which side feels harder to ask for right now?",
    "This could be off — but it sounds less like you're confused and more like you already know and you don't love the answer yet.",
    "Something keeps circling in what you've shared. You come back to the same place without naming it directly. What's the word you'd give it?",
    "I think you're holding two things that pull in opposite directions. Which one feels more true when no one's watching?",
    "Something's sitting underneath all of this. I'm not sure what to name it yet. What word would you use?",
    "There's a version of this that's bigger than the surface. What's the version you haven't said yet?",
    "I keep coming back to one thing. Not the surface of what you said — the thing underneath. Does it feel accurate when you sit with it?",
    "You know more about this than you're letting yourself see. What do you already know?",

    // Open / discovery
    "What would it change if you let yourself actually believe that?",
    "What's the version of you in five years think about where you are right now?",
    "What part of you is trying to protect you — and is it working?",
    "What do you keep coming back to that you haven't fully let yourself look at?",
    "What do you want that you haven't let yourself want out loud yet?",
    "If you could know one true thing about yourself, what would you want it to be?",

    // Pattern recognition — noticing contradictions
    "You said two things that pull against each other. I don't think that's an accident — which one is more true?",
    "There's something you keep circling around without landing on. What's the word you keep avoiding?",
    "You described something as small, but you came here to talk about it. What makes it small?",
    "The way you described that — there's something in the specific word you chose. What did you mean by it?",
    "You've mentioned this more than once. That usually means something. What is it?",

    // Self-trust / intuition
    "You already know. What's the thing you know?",
    "What does your gut say, before your brain complicates it?",
    "You've been talking around something. What's the direct version?",
    "What would you decide if you trusted yourself completely right now?",
    "There's a version of you who figured this out. What did she know that you're pretending not to?",

    // Deeper pattern work
    "What are you teaching people about how to treat you without meaning to?",
    "You keep choosing this kind of situation. What does it offer you that keeps bringing you back?",
    "What does this keep protecting you from having to do or feel?",
    "The reaction feels big relative to the situation. What older thing might this be touching?",
    "You said you don't care — but you're here talking about it. What do you actually care about?",

    // Identity and values
    "What's a line you have that you've never crossed? What does that tell you about who you are?",
    "When you imagine the person you want to be, what's the thing you're doing that you're not doing now?",
    "What value of yours is in conflict here? That's usually where the stuck feeling comes from.",

    // Contradiction and growth
    "You're describing being two different people in two different situations. Which one is more you?",
    "What's the gap between what you say you want and what you keep choosing?",
    "Growth doesn't always feel like progress. What's changing in you that doesn't feel good yet?",

    // Closing inquiry
    "What's the thing you'd want to remember from this conversation?",
    "What question would actually be useful to sit with after this?",
  ],

  // ─── Parent Coach — 44 replies ────────────────────────────────────────────
  parentCoach: [
    // Greetings
    "Hey. Glad you're here. What's going on at home?",
    "Hi. Tell me what's happening — I'm listening.",
    "What brought you here today? Start wherever feels right.",

    // Emotional support
    "That sounds like a lot to carry. What's the part that's hardest right now?",
    "Tell me what you're actually seeing — not what you're afraid of, just what's there.",
    "What would feel different if this conversation went well?",
    "You showed up for this. That matters. What's weighing on you most?",
    "That sounds exhausting. How long have you been holding that?",
    "You're doing the harder thing, which is actually caring about this. What's the most pressing part?",

    // Practical / advice
    "What's one thing you could do differently next time — not the whole repair, just one thing?",
    "What do you actually know about what your teen is going through, vs. what you're filling in?",
    "What did they need from you in that moment? And what did you give them instead?",
    "When did things start to shift? Not the argument — the thing before the argument.",

    // Closing / forward
    "What would success look like for the next conversation you have with them?",
    "You can't fix everything, but you can show up. What's the smallest way to do that tomorrow?",

    // Parenting guilt
    "You're here, which means you care. Guilt that shows up as action is different from guilt that just sits there.",
    "You can't undo that moment. What can you do in the next one?",
    "The fact that it's bothering you is actually a good sign. What do you want to do with it?",

    // Celebrating teen wins
    "That's worth celebrating. Did you tell them you noticed?",
    "Your teen did something hard. How did you respond in the moment?",
    "That's a real win for them. What do you think helped it happen?",

    // Communication repair
    "What did you mean to say versus what actually came out?",
    "If you could have that conversation again, what would you say differently?",
    "What do you think they heard? Not what you said — what they actually heard.",
    "An apology without explanation or an explanation without apology — which does your teen need?",

    // Parent's own overwhelm
    "Parenting a teenager while managing your own life is a lot. What's feeling most out of control right now?",
    "You're allowed to be struggling with this. What would help you first before you can help them?",
    "It sounds like you needed someone to say it's hard before you could even get to the advice. Is that right?",
    "What would you tell a friend who came to you with this same thing?",

    // Co-regulation and presence
    "Your nervous system affects theirs. How are you doing right now, honestly?",
    "You can't pour from empty. What would help you regulate before the next conversation with them?",
    "What does it feel like in your body when things escalate with them? Where do you feel it?",

    // Listening without fixing
    "What if the goal of the next conversation was just to understand them, not fix anything?",
    "What do you think they actually need from you in this moment — advice, presence, or space?",
    "Have you asked them what they need? Not what you think they need — what they say they need?",

    // Understanding teen perspective
    "When you were their age, what did you need most from a parent that you weren't getting?",
    "What do you think they're most afraid of right now? Not about you — in general?",
    "What does their world feel like from inside it? What pressures are they carrying?",

    // Long-term connection
    "What kind of relationship do you want with them in ten years? What would build toward that?",
    "Connection with teenagers is built in small moments. What's a small moment you could create this week?",
    "What's one thing you could do consistently that would help them feel safe coming to you?",

    // Repair after rupture
    "Repair doesn't require perfection. What's the smallest honest thing you could say?",
    "Teenagers remember when adults take accountability. What would a real repair look like here?",
    "You don't have to have all the answers. Sometimes 'I'm still figuring this out too' is enough.",
  ],
};
