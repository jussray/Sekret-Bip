// Single shared crisis-input policy for Se'kret companion safety.
// Imported by both client safety code and the companion Worker so the paths
// cannot drift. This is a conservative keyword gate, not a diagnosis and not
// comprehensive crisis recognition.

export function normalizeCrisisText(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’ʼ']/g, '')
    .replace(/\b(can|don|do|did|doesn|wasn|weren|won|isn|aren|couldn|shouldn|wouldn) t\b/g, '$1t')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

const CRISIS_PATTERN = /\b(?:kill myself|end my life|want to die|suicid(?:e|al)|self ?harm|hurt myself|cut myself|kill(?:ing)? myself|end (?:it all|my life)|better off dead|cutting myself|overdose|disappear forever|(?:i (?:want|need|plan) to run away|(?:im|i am) running away|running away from home)|(?:being abused|i was abused|i am abused|someone is abusing me|abused me)|(?:being assaulted|i was assaulted|someone assaulted me|there was an assault|sexual assault)|(?:^unsafe$|^not safe$|^danger$|^emergency$|^abuse$|^abused$|^assault$|^run away$)|(?:i feel unsafe|i am unsafe|im unsafe|we feel unsafe|i dont feel safe|i do not feel safe|it is not safe here|its not safe here|im not safe|not safe here|not safe at home|my home is unsafe)|(?:(?:i am|im|i feel|i might be|we are|were|my (?:brother|sister|friend|mother|father|mom|dad|family) is|someone is|someone might be) in danger|in immediate danger|danger right now|this is dangerous)|(?:this is an emergency|it is an emergency|there is an emergency|theres an emergency|i have an emergency|emergency right now|medical emergency)|(?:dont|do not|no longer|not) want to live(?! (?:(?:in|at|near|around|outside|anywhere|somewhere|here|there)\b(?! (?:anymore|any more|this world|like this))))|(?:dont|do not|not) want to be alive|(?:dont|do not) want to be here (?:anymore|any more|in this world|like this)|wish i (?:was|were) dead(?! (?:tired|asleep|broke|serious|lol|af))|wish i (?:wasnt|werent) alive|no reason (?:to|for me to) (?:keep )?(?:live|living|be alive)|no point (?:in )?living|cant go on (?:anymore|any more|like this|living)|cannot go on (?:anymore|any more|like this))\b/;

export function isCrisisText(text: unknown): boolean {
  return typeof text === 'string' && CRISIS_PATTERN.test(normalizeCrisisText(text));
}
