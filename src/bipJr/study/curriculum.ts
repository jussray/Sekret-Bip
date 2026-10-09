// src/bipJr/study/curriculum.ts
// Recovered from jussray/bip-jr@cf773ff14c677b706e600437de6c779c3e9c37f2:src/child/services/studyBuddy.ts (blob 0b9a90b3).
// Scripted, reviewed missions only: nothing here calls an AI service or the network.

import type { ChildAgeBand, StudyMission, StudyProgressSnapshot, StudySubject } from './types';

const curriculum: Record<ChildAgeBand, Record<StudySubject, ReadonlyArray<Omit<StudyMission, 'id' | 'ageBand' | 'subject' | 'sequence' | 'level'>>>> = {
  '5-7': {
    reading: [
      {
        title: 'Sound detective',
        goal: 'Hear the first sound',
        prompt: 'Which word starts with the same sound as “sun”?',
        choices: [
          { id: 'a', label: 'sock' },
          { id: 'b', label: 'moon' },
          { id: 'c', label: 'fish' },
        ],
        correctChoiceId: 'a',
        hint: 'Stretch “sun”: sss-un.',
        explanation: 'Sun and sock both begin with the /s/ sound.',
        offlineFinish: 'Find one more object that starts with /s/.',
      },
      {
        title: 'Letter match',
        goal: 'Match a letter to its sound',
        prompt: 'Which letter usually makes the first sound in “ball”?',
        choices: [
          { id: 'a', label: 'B' },
          { id: 'b', label: 'M' },
          { id: 'c', label: 'T' },
        ],
        correctChoiceId: 'a',
        hint: 'Say “ball” slowly: bbb-all.',
        explanation: 'The letter B makes the /b/ sound at the start of ball.',
        offlineFinish: 'Trace a big B in the air.',
      },
    ],
    math: [
      {
        title: 'Count and add',
        goal: 'Join two small groups',
        prompt: 'You have 3 crayons and get 2 more. How many crayons now?',
        choices: [
          { id: 'a', label: '4' },
          { id: 'b', label: '5' },
          { id: 'c', label: '6' },
        ],
        correctChoiceId: 'b',
        hint: 'Count on from 3: 4, 5.',
        explanation: 'Three plus two equals five.',
        offlineFinish: 'Show 5 with blocks, socks, or fingers.',
      },
      {
        title: 'Which has more?',
        goal: 'Compare two groups',
        prompt: 'Which group has more: 6 stars or 4 stars?',
        choices: [
          { id: 'a', label: '6 stars' },
          { id: 'b', label: '4 stars' },
          { id: 'c', label: 'They are equal' },
        ],
        correctChoiceId: 'a',
        hint: 'Count each group once.',
        explanation: 'Six is greater than four.',
        offlineFinish: 'Make a group of 6 and a group of 4.',
      },
    ],
    science: [
      {
        title: 'Living or not?',
        goal: 'Notice what living things need',
        prompt: 'A plant grows and needs water. Is it living?',
        choices: [
          { id: 'a', label: 'Yes' },
          { id: 'b', label: 'No' },
          { id: 'c', label: 'Only at night' },
        ],
        correctChoiceId: 'a',
        hint: 'Living things grow and need resources.',
        explanation: 'A plant is living because it grows and needs water, light, and air.',
        offlineFinish: 'Point to one living and one nonliving thing.',
      },
      {
        title: 'Weather watcher',
        goal: 'Connect clothing to weather',
        prompt: 'It is raining outside. What helps keep you dry?',
        choices: [
          { id: 'a', label: 'Raincoat' },
          { id: 'b', label: 'Sandals only' },
          { id: 'c', label: 'Sunglasses only' },
        ],
        correctChoiceId: 'a',
        hint: 'Think about what blocks water.',
        explanation: 'A raincoat helps keep rain off your clothes and skin.',
        offlineFinish: 'Look outside and name today’s weather.',
      },
    ],
    language: [
      {
        title: 'Hello around the world',
        goal: 'Practice a greeting',
        prompt: 'What does Spanish “hola” mean?',
        choices: [
          { id: 'a', label: 'Goodbye' },
          { id: 'b', label: 'Hello' },
          { id: 'c', label: 'Thank you' },
        ],
        correctChoiceId: 'b',
        hint: '“Hola” is used when you greet someone.',
        explanation: 'Hola means hello.',
        offlineFinish: 'Wave and say “hola” to an approved grown-up.',
      },
      {
        title: 'Count in Spanish',
        goal: 'Practice one number word',
        prompt: 'Which Spanish word means “one”?',
        choices: [
          { id: 'a', label: 'uno' },
          { id: 'b', label: 'dos' },
          { id: 'c', label: 'tres' },
        ],
        correctChoiceId: 'a',
        hint: 'It sounds like “oo-no.”',
        explanation: 'Uno means one.',
        offlineFinish: 'Hold up one finger and say “uno.”',
      },
    ],
    study_skills: [
      {
        title: 'Ready-to-learn check',
        goal: 'Choose one tiny reset',
        prompt: 'Which choice can help your body get ready to learn?',
        choices: [
          { id: 'a', label: 'Take one slow breath' },
          { id: 'b', label: 'Open five games' },
          { id: 'c', label: 'Hide the work' },
        ],
        correctChoiceId: 'a',
        hint: 'Pick the calmest one-minute action.',
        explanation: 'One slow breath can help your body pause and focus.',
        offlineFinish: 'Take one slow breath with a trusted grown-up nearby.',
      },
      {
        title: 'One thing first',
        goal: 'Start with a single step',
        prompt: 'What is a good first step before drawing a picture?',
        choices: [
          { id: 'a', label: 'Find paper' },
          { id: 'b', label: 'Finish everything at once' },
          { id: 'c', label: 'Give up' },
        ],
        correctChoiceId: 'a',
        hint: 'Choose the smallest action.',
        explanation: 'Finding paper gives you a clear place to begin.',
        offlineFinish: 'Gather only the first item you need.',
      },
    ],
  },
  '8-10': {
    reading: [
      {
        title: 'Main idea finder',
        goal: 'Tell what all details are mostly about',
        prompt: 'A paragraph explains how bees move pollen between flowers. What is the main idea?',
        choices: [
          { id: 'a', label: 'Bees help flowers by moving pollen' },
          { id: 'b', label: 'All insects live in hives' },
          { id: 'c', label: 'Flowers never need insects' },
        ],
        correctChoiceId: 'a',
        hint: 'Choose the answer that covers all the details.',
        explanation: 'The paragraph is mainly about bees helping flowers through pollination.',
        offlineFinish: 'Read a short paragraph and say its main idea in one sentence.',
      },
      {
        title: 'Context clue search',
        goal: 'Use nearby words to infer meaning',
        prompt: '“The puppy was famished, so it ate quickly.” What does famished most likely mean?',
        choices: [
          { id: 'a', label: 'Very hungry' },
          { id: 'b', label: 'Very sleepy' },
          { id: 'c', label: 'Very clean' },
        ],
        correctChoiceId: 'a',
        hint: 'The puppy ate quickly right after the word.',
        explanation: 'The clue about eating quickly shows that famished means very hungry.',
        offlineFinish: 'Find one unfamiliar word and underline a nearby clue.',
      },
    ],
    math: [
      {
        title: 'Build twelve',
        goal: 'Add and explain',
        prompt: 'What is 8 + 4?',
        choices: [
          { id: 'a', label: '10' },
          { id: 'b', label: '12' },
          { id: 'c', label: '14' },
        ],
        correctChoiceId: 'b',
        hint: 'Count up four times from 8: 9, 10, 11, 12.',
        explanation: 'Eight plus four equals twelve.',
        offlineFinish: 'Show 12 using two different groups of objects.',
      },
      {
        title: 'Equal groups',
        goal: 'Connect multiplication to groups',
        prompt: 'There are 3 bags with 4 apples in each bag. How many apples total?',
        choices: [
          { id: 'a', label: '7' },
          { id: 'b', label: '12' },
          { id: 'c', label: '16' },
        ],
        correctChoiceId: 'b',
        hint: 'Add 4 three times.',
        explanation: 'Three equal groups of four make twelve.',
        offlineFinish: 'Draw three circles with four dots in each.',
      },
    ],
    science: [
      {
        title: 'Plant power',
        goal: 'Identify what a plant is missing',
        prompt: 'A plant is kept in a dark closet. What is it most likely missing?',
        choices: [
          { id: 'a', label: 'Light' },
          { id: 'b', label: 'Sound' },
          { id: 'c', label: 'A pillow' },
        ],
        correctChoiceId: 'a',
        hint: 'The word “dark” is the clue.',
        explanation: 'Plants use light, water, and air to grow.',
        offlineFinish: 'Check a plant or outdoor space and name what helps it grow.',
      },
      {
        title: 'State of matter',
        goal: 'Classify a familiar material',
        prompt: 'Water in an ice cube tray becomes ice. What state is the ice?',
        choices: [
          { id: 'a', label: 'Solid' },
          { id: 'b', label: 'Liquid' },
          { id: 'c', label: 'Gas' },
        ],
        correctChoiceId: 'a',
        hint: 'Ice keeps its own shape.',
        explanation: 'Ice is the solid state of water.',
        offlineFinish: 'Name one solid and one liquid near you.',
      },
    ],
    language: [
      {
        title: 'Introduce yourself',
        goal: 'Use a simple Spanish sentence',
        prompt: 'What does “Me llamo Sky” mean?',
        choices: [
          { id: 'a', label: 'I am tired' },
          { id: 'b', label: 'My name is Sky' },
          { id: 'c', label: 'I like the sky' },
        ],
        correctChoiceId: 'b',
        hint: '“Me llamo” is used to tell your name.',
        explanation: 'Me llamo means “My name is.”',
        offlineFinish: 'Practice the sentence once with an approved adult.',
      },
      {
        title: 'Polite words',
        goal: 'Choose the Spanish thank-you',
        prompt: 'Which Spanish word means “thank you”?',
        choices: [
          { id: 'a', label: 'gracias' },
          { id: 'b', label: 'hola' },
          { id: 'c', label: 'adiós' },
        ],
        correctChoiceId: 'a',
        hint: 'It begins with a hard g sound.',
        explanation: 'Gracias means thank you.',
        offlineFinish: 'Say “gracias” after someone helps you today.',
      },
    ],
    study_skills: [
      {
        title: 'Break it into three',
        goal: 'Turn one task into tiny steps',
        prompt: 'What is the best first step for a worksheet?',
        choices: [
          { id: 'a', label: 'Write your name and date' },
          { id: 'b', label: 'Worry about every page' },
          { id: 'c', label: 'Skip the directions' },
        ],
        correctChoiceId: 'a',
        hint: 'Pick a visible step that takes less than a minute.',
        explanation: 'A tiny first action lowers the barrier to starting.',
        offlineFinish: 'Do only that first step, then mark it finished.',
      },
      {
        title: 'Distraction plan',
        goal: 'Choose a focus-friendly action',
        prompt: 'A notification appears during homework. What can help you stay focused?',
        choices: [
          { id: 'a', label: 'Silence it until the break' },
          { id: 'b', label: 'Open every message' },
          { id: 'c', label: 'Start a new video' },
        ],
        correctChoiceId: 'a',
        hint: 'Protect the task for a short period.',
        explanation: 'Silencing a notification until a planned break reduces switching.',
        offlineFinish: 'Set up one distraction-free 10-minute block.',
      },
    ],
  },
  '11-12': {
    reading: [
      {
        title: 'Claim and evidence',
        goal: 'Identify evidence that supports a claim',
        prompt: 'A writer claims school gardens improve science learning. Which evidence is strongest?',
        choices: [
          { id: 'a', label: 'Students say gardens look nice' },
          { id: 'b', label: 'Test scores rose after garden lessons' },
          { id: 'c', label: 'The writer likes tomatoes' },
        ],
        correctChoiceId: 'b',
        hint: 'Look for measured results connected to learning.',
        explanation: 'A change in test results directly supports the learning claim.',
        offlineFinish: 'Find one claim in schoolwork and underline its evidence.',
      },
      {
        title: 'Author’s purpose',
        goal: 'Infer why a text was written',
        prompt: 'A text gives steps for checking a source before sharing it. What is the author’s main purpose?',
        choices: [
          { id: 'a', label: 'To instruct' },
          { id: 'b', label: 'To entertain with a story' },
          { id: 'c', label: 'To sell a product' },
        ],
        correctChoiceId: 'a',
        hint: 'The text provides actions the reader can follow.',
        explanation: 'Step-by-step directions are usually written to instruct.',
        offlineFinish: 'Label one text you read today: inform, persuade, entertain, or instruct.',
      },
    ],
    math: [
      {
        title: 'Explain the operation',
        goal: 'Choose an operation from context',
        prompt: 'Twenty-four pencils are shared equally among 6 tables. Which operation solves it?',
        choices: [
          { id: 'a', label: '24 + 6' },
          { id: 'b', label: '24 ÷ 6' },
          { id: 'c', label: '24 × 6' },
        ],
        correctChoiceId: 'b',
        hint: '“Shared equally” asks how many are in each group.',
        explanation: 'Division finds the size of each equal group: 24 ÷ 6 = 4.',
        offlineFinish: 'Write one new sharing problem with a whole-number answer.',
      },
      {
        title: 'Percent sense',
        goal: 'Connect a percent to a fraction',
        prompt: 'Which fraction is equal to 25%?',
        choices: [
          { id: 'a', label: '1/4' },
          { id: 'b', label: '1/2' },
          { id: 'c', label: '3/4' },
        ],
        correctChoiceId: 'a',
        hint: 'Twenty-five out of one hundred simplifies.',
        explanation: '25/100 simplifies to 1/4.',
        offlineFinish: 'Find one real-life example of a quarter or 25%.',
      },
    ],
    science: [
      {
        title: 'Testable question',
        goal: 'Choose a fair-test question',
        prompt: 'Which question about music and plants can be tested fairly?',
        choices: [
          { id: 'a', label: 'Do plants like music?' },
          { id: 'b', label: 'Do identical plants grow different heights with and without the same daily music?' },
          { id: 'c', label: 'Is music good?' },
        ],
        correctChoiceId: 'b',
        hint: 'A testable question names what changes and what is measured.',
        explanation: 'The second question identifies groups, a condition, and a measurable outcome.',
        offlineFinish: 'Write the independent and dependent variables on paper.',
      },
      {
        title: 'Energy transfer',
        goal: 'Track where energy moves',
        prompt: 'A lamp shines on a solar calculator. What energy change occurs?',
        choices: [
          { id: 'a', label: 'Light energy becomes electrical energy' },
          { id: 'b', label: 'Sound becomes gravity' },
          { id: 'c', label: 'Heat becomes mass' },
        ],
        correctChoiceId: 'a',
        hint: 'Solar cells respond to light.',
        explanation: 'The calculator’s solar cell converts light energy into electrical energy.',
        offlineFinish: 'Name one device and describe where its energy comes from.',
      },
    ],
    language: [
      {
        title: 'Useful conversation',
        goal: 'Interpret a Spanish exchange',
        prompt: '“¿Cómo estás?” — “Estoy bien.” What does the exchange mean?',
        choices: [
          { id: 'a', label: 'How are you? — I am well.' },
          { id: 'b', label: 'Where are you? — At school.' },
          { id: 'c', label: 'What time is it? — Noon.' },
        ],
        correctChoiceId: 'a',
        hint: 'The first line asks about someone’s condition.',
        explanation: '¿Cómo estás? asks how you are; Estoy bien says you are well.',
        offlineFinish: 'Say both lines aloud, switching roles.',
      },
      {
        title: 'Choose the response',
        goal: 'Respond politely in Spanish',
        prompt: 'Someone says “Gracias.” Which response means “You’re welcome”?',
        choices: [
          { id: 'a', label: 'De nada' },
          { id: 'b', label: 'Buenos días' },
          { id: 'c', label: 'Por qué' },
        ],
        correctChoiceId: 'a',
        hint: 'This phrase is a common reply to thanks.',
        explanation: 'De nada means you’re welcome.',
        offlineFinish: 'Practice “Gracias” and “De nada” with an approved adult.',
      },
    ],
    study_skills: [
      {
        title: 'Focus sprint',
        goal: 'Define a visible finish line',
        prompt: 'Which goal is best for a 10-minute focus sprint?',
        choices: [
          { id: 'a', label: 'Do everything perfectly' },
          { id: 'b', label: 'Solve five problems' },
          { id: 'c', label: 'Study forever' },
        ],
        correctChoiceId: 'b',
        hint: 'Choose something specific and countable.',
        explanation: 'A visible finish line makes a short sprint realistic.',
        offlineFinish: 'Set one 10-minute sprint with an adult-approved timer.',
      },
      {
        title: 'Check your source',
        goal: 'Use a credibility habit',
        prompt: 'Before using an online fact, what should you check first?',
        choices: [
          { id: 'a', label: 'Who published it and when' },
          { id: 'b', label: 'Whether the page has bright colors' },
          { id: 'c', label: 'How many emojis it uses' },
        ],
        correctChoiceId: 'a',
        hint: 'Look for authorship, date, and evidence.',
        explanation: 'Source and date checks help you judge whether information is trustworthy.',
        offlineFinish: 'Use the check on one school source.',
      },
    ],
  },
};

export function getStudyMissions(ageBand: ChildAgeBand, subject: StudySubject): StudyMission[] {
  return curriculum[ageBand][subject].map((mission, index) => ({
    ...mission,
    id: `${ageBand}-${subject}-${index + 1}`,
    sequence: index + 1,
    level: index === 0 ? 'warm_up' : 'practice',
    ageBand,
    subject,
  }));
}

export function getNextStudyMission(
  ageBand: ChildAgeBand,
  subject: StudySubject,
  progress: StudyProgressSnapshot,
): StudyMission {
  const missions = getStudyMissions(ageBand, subject);
  return missions.find(mission => !progress.completedMissionIds.includes(mission.id)) ?? missions[0];
}

// Moves forward from the current mission: the next unfinished one, or simply the
// next one once the whole subject is finished, so every mission can be replayed.
export function getMissionAfter(
  ageBand: ChildAgeBand,
  subject: StudySubject,
  progress: StudyProgressSnapshot,
  currentMissionId: string,
): StudyMission {
  const missions = getStudyMissions(ageBand, subject);
  const current = missions.findIndex(mission => mission.id === currentMissionId);
  if (current === -1) return getNextStudyMission(ageBand, subject, progress);
  for (let step = 1; step <= missions.length; step += 1) {
    const candidate = missions[(current + step) % missions.length];
    if (!progress.completedMissionIds.includes(candidate.id)) return candidate;
  }
  return missions[(current + 1) % missions.length];
}

export function getSubjectCompletion(
  ageBand: ChildAgeBand,
  subject: StudySubject,
  progress: StudyProgressSnapshot,
): { completed: number; total: number } {
  const missions = getStudyMissions(ageBand, subject);
  return {
    completed: missions.filter(mission => progress.completedMissionIds.includes(mission.id)).length,
    total: missions.length,
  };
}

export function isCorrectStudyChoice(mission: StudyMission, choiceId: string): boolean {
  return mission.correctChoiceId === choiceId;
}
