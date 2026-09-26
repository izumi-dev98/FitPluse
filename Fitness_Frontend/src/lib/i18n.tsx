import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Language = 'en' | 'my';

type Dictionary = Record<string, string>;

const MYANMAR: Dictionary = {
  Language: 'ဘာသာစကား', Today: 'ယနေ့', Log: 'မှတ်တမ်း', Progress: 'တိုးတက်မှု', Calendar: 'ပြက္ခဒိန်', Cal: 'ပြက္ခဒိန်', Goals: 'ရည်မှန်းချက်များ', Foods: 'အစားအစာများ', Workout: 'လေ့ကျင့်ခန်း', Badges: 'ဆုတံဆိပ်များ', Profile: 'ပရိုဖိုင်', You: 'သင့်အကောင့်', 'Sign out': 'ထွက်ရန်',
  Dashboard: 'ဒက်ရှ်ဘုတ်', 'Daily Tracker': 'နေ့စဉ်မှတ်တမ်း', 'Badges & Achievements': 'ဆုတံဆိပ်များနှင့် အောင်မြင်မှုများ',
  'No foods yet': 'အစားအစာ မရှိသေးပါ', 'No exercises yet': 'လေ့ကျင့်ခန်း မရှိသေးပါ', Name: 'အမည်', Type: 'အမျိုးအစား', Description: 'ဖော်ပြချက်', Actions: 'လုပ်ဆောင်ချက်များ', Date: 'ရက်စွဲ', Food: 'အစားအစာ', Exercise: 'လေ့ကျင့်ခန်း', Meal: 'အစားအစာအချိန်', Quantity: 'ပမာဏ', Qty: 'ပမာဏ', Serving: 'စားသုံးပမာဏ', Macros: 'အာဟာရဓာတ်များ',
  'Food log': 'အစားအစာမှတ်တမ်း', 'Exercise log': 'လေ့ကျင့်ခန်းမှတ်တမ်း', 'Logged meals, newest first.': 'မှတ်တမ်းတင်ထားသော အစားအစာများ', 'Logged workouts, newest first.': 'မှတ်တမ်းတင်ထားသော လေ့ကျင့်ခန်းများ',
  Calories: 'ကယ်လိုရီ', Protein: 'ပရိုတင်း', Fat: 'အဆီ', Carbs: 'ကာဗိုဟိုက်ဒရိတ်', Water: 'ရေ', Steps: 'ခြေလှမ်းများ', Target: 'ရည်မှန်းချက်', Left: 'ကျန်ရှိ', Burned: 'လောင်ကျွမ်း', Save: 'သိမ်းမည်', Cancel: 'ပယ်ဖျက်မည်', Close: 'ပိတ်မည်', Edit: 'ပြင်မည်', Delete: 'ဖျက်မည်', Search: 'ရှာဖွေမည်',
  'No food logs yet': 'အစားအစာမှတ်တမ်း မရှိသေးပါ', 'No exercise logs yet': 'လေ့ကျင့်ခန်းမှတ်တမ်း မရှိသေးပါ', 'No daily records yet': 'နေ့စဉ်မှတ်တမ်း မရှိသေးပါ', 'No goals yet': 'ရည်မှန်းချက် မရှိသေးပါ', History: 'မှတ်တမ်း', Started: 'စတင်ခဲ့သည်', Result: 'ရလဒ်', Intake: 'စားသုံးမှု', Net: 'အသားတင်', 'Vs goal': 'ရည်မှန်းချက်နှင့် နှိုင်းယှဉ်မှု',
  'Ready to Start?': 'စတင်ရန် အသင့်ဖြစ်ပြီလား', 'What\'s your goal?': 'သင့်ရည်မှန်းချက်က ဘာလဲ', 'Your Stats': 'သင့်အချက်အလက်များ', 'Activity Level': 'လှုပ်ရှားမှုအဆင့်', Gender: 'လိင်', Age: 'အသက်', 'Weight (kg)': 'ကိုယ်အလေးချိန် (ကီလိုဂရမ်)', 'Height (cm)': 'အရပ် (စင်တီမီတာ)', Male: 'အမျိုးသား', Female: 'အမျိုးသမီး',
  'Recommended food and nutrition': 'အကြံပြုအစားအစာနှင့် အာဟာရ', 'Recommended exercise routine': 'အကြံပြုလေ့ကျင့်ခန်းအစီအစဉ်', 'Use suggestion': 'အကြံပြုချက်ကို အသုံးပြုမည်', 'Suggested starting goal': 'အကြံပြုစတင်ရမည့် ရည်မှန်းချက်', 'Calorie strategy': 'ကယ်လိုရီနည်းလမ်း', 'Protein range': 'ပရိုတင်းအတိုင်းအတာ',
  'Earned Badges': 'ရရှိထားသော ဆုတံဆိပ်များ', 'Badge Earned!': 'ဆုတံဆိပ် ရရှိပြီ', 'Loading...': 'ဖတ်နေသည်...', 'Loading your goals...': 'ရည်မှန်းချက်များကို ဖတ်နေသည်...', 'Loading your badges...': 'ဆုတံဆိပ်များကို ဖတ်နေသည်...', 'Loading profile...': 'ပရိုဖိုင်ကို ဖတ်နေသည်...',
  'Keep your personal food library. Create items with custom fields.': 'သင့်အစားအစာစာရင်းကို စီမံပါ။ အစားအစာအသစ်များ ဖန်တီးပါ။', 'Keep your personal exercise library. Create items with custom fields.': 'သင့်လေ့ကျင့်ခန်းစာရင်းကို စီမံပါ။ လေ့ကျင့်ခန်းအသစ်များ ဖန်တီးပါ။',
  'Browse your saved foods or add a new item.': 'သိမ်းထားသောအစားအစာများကို ကြည့်ရှုပါ သို့မဟုတ် အသစ်ထည့်ပါ။', 'Browse your saved exercises or add a new item.': 'သိမ်းထားသောလေ့ကျင့်ခန်းများကို ကြည့်ရှုပါ သို့မဟုတ် အသစ်ထည့်ပါ။', 'Search foods...': 'အစားအစာ ရှာမည်...', 'Search exercises...': 'လေ့ကျင့်ခန်း ရှာမည်...',
  'Monthly view of daily targets. Green = on target. Tap a day for the full record.': 'နေ့စဉ်ရည်မှန်းချက်များကို လစဉ်ကြည့်ရှုပါ။ အစိမ်းရောင်သည် ရည်မှန်းချက်ပြည့်မီခြင်းဖြစ်သည်။', 'Track food, workouts, water, and steps in one place.': 'အစားအစာ၊ လေ့ကျင့်ခန်း၊ ရေနှင့် ခြေလှမ်းများကို တစ်နေရာတည်းတွင် မှတ်တမ်းတင်ပါ။', 'Account, body stats, photos, and security.': 'အကောင့်၊ ကိုယ်ခန္ဓာအချက်အလက်၊ ဓာတ်ပုံနှင့် လုံခြုံရေး။',
  'Daily Calories': 'နေ့စဉ်ကယ်လိုရီ', 'kcal eaten': 'စားသုံးသော kcal', 'kcal burned': 'လောင်ကျွမ်းသော kcal', 'Total burned': 'စုစုပေါင်းလောင်ကျွမ်းမှု', 'No food yet': 'အစားအစာ မရှိသေးပါ', 'No workout yet': 'လေ့ကျင့်ခန်း မရှိသေးပါ', 'Log food': 'အစားအစာ မှတ်တမ်းတင်မည်', 'Log workout': 'လေ့ကျင့်ခန်း မှတ်တမ်းတင်မည်', 'Add to today': 'ယနေ့ထဲသို့ ထည့်မည်', 'Add to log': 'မှတ်တမ်းထဲသို့ ထည့်မည်', 'Upload photo': 'ဓာတ်ပုံတင်မည်',
  'First name': 'အမည်', 'Email': 'အီးမေးလ်', 'Password': 'စကားဝှက်', 'Confirm Password': 'စကားဝှက်အတည်ပြုပါ', 'Login': 'ဝင်မည်', 'Sign up': 'စာရင်းသွင်းမည်', 'Create account': 'အကောင့်ဖန်တီးမည်', 'Forgot password?': 'စကားဝှက်မေ့နေပါသလား',
  'Goals you set, plus every day you logged against them.': 'သတ်မှတ်ထားသော ရည်မှန်းချက်များနှင့် နေ့စဉ်မှတ်တမ်းများ။', 'Daily records': 'နေ့စဉ်မှတ်တမ်းများ', 'Goal history': 'ရည်မှန်းချက်မှတ်တမ်း', 'Open Daily Tracker': 'နေ့စဉ်မှတ်တမ်းကို ဖွင့်မည်',
  'Total XP: ': 'စုစုပေါင်း XP: ', 'Rank: ': 'အဆင့်: ', 'Next Rank': 'နောက်အဆင့်', 'Goal Progress': 'ရည်မှန်းချက်တိုးတက်မှု', 'Consistency Streaks': 'ဆက်တိုက်မှတ်တမ်းများ', 'Daily logging streaks (7/30/60 days)': 'နေ့စဉ်မှတ်တမ်းဆက်တိုက် (၇/၃၀/၆၀ ရက်)', 'Target Adherence': 'ရည်မှန်းချက်လိုက်နာမှု', 'Staying within 10% of daily calorie goal': 'နေ့စဉ်ကယ်လိုရီရည်မှန်းချက်၏ ၁၀% အတွင်းရှိခြင်း', Current: 'လက်ရှိ', 'XP Reward: ': 'XP ဆု: ', 'Complete the previous badge to unlock this one': 'ယခင်ဆုတံဆိပ်ကို ရရှိပြီးမှ ဤဆုတံဆိပ်ကို ဖွင့်နိုင်မည်',
  'Loading calendar…': 'ပြက္ခဒိန်ကို ဖတ်နေသည်...', 'Loading your day…': 'ယနေ့မှတ်တမ်းကို ဖတ်နေသည်...', 'Quick-add water or set today’s step count.': 'ရေကို အမြန်ထည့်ပါ သို့မဟုတ် ယနေ့ခြေလှမ်းအရေအတွက် သတ်မှတ်ပါ။', 'Add front, side, or back photos to see visual progress.': 'တိုးတက်မှုကို မြင်နိုင်ရန် ရှေ့၊ ဘေး သို့မဟုတ် နောက်ဓာတ်ပုံ ထည့်ပါ။', 'No foods yet. Add some on the Foods page.': 'အစားအစာ မရှိသေးပါ။ Foods စာမျက်နှာတွင် ထည့်ပါ။', 'No exercises yet. Add some on the Workout page.': 'လေ့ကျင့်ခန်း မရှိသေးပါ။ Workout စာမျက်နှာတွင် ထည့်ပါ။',
  'Sets': 'အကြိမ်အုပ်စု', 'Reps': 'အကြိမ်ရေ', 'Minutes': 'မိနစ်', 'Sets × reps': 'အုပ်စု × အကြိမ်ရေ', 'All logged meals, newest first.': 'အစားအစာမှတ်တမ်းအားလုံး၊ အသစ်ဆုံးမှ စီထားသည်။', 'All logged workouts, newest first.': 'လေ့ကျင့်ခန်းမှတ်တမ်းအားလုံး၊ အသစ်ဆုံးမှ စီထားသည်။',
  'Set a goal to see remaining calories': 'ကျန်ရှိသောကယ်လိုရီကို ကြည့်ရန် ရည်မှန်းချက်သတ်မှတ်ပါ', 'Days logged': 'မှတ်တမ်းတင်ထားသောရက်များ', 'Avg intake': 'ပျမ်းမျှစားသုံးမှု', 'Avg burned': 'ပျမ်းမျှလောင်ကျွမ်းမှု', 'Target hit rate': 'ရည်မှန်းချက်ပြည့်မီနှုန်း', 'Log streak': 'မှတ်တမ်းဆက်တိုက်ရက်', 'On target': 'ရည်မှန်းချက်ပြည့်မီ', 'Under target': 'ရည်မှန်းချက်အောက်', 'Over target': 'ရည်မှန်းချက်ကျော်', 'No log': 'မှတ်တမ်းမရှိ',
  'How It Works': 'အလုပ်လုပ်ပုံ', BMR: 'အနားယူချိန်ကယ်လိုရီ', TDEE: 'နေ့စဉ်စွမ်းအင်သုံးစွဲမှု', 'Calorie Target': 'ကယ်လိုရီရည်မှန်းချက်', 'Protein / Fat / Carbs': 'ပရိုတင်း / အဆီ / ကာဗိုဟိုက်ဒရိတ်', 'Live Preview': 'တိုက်ရိုက်ကြိုတင်ကြည့်ရှုမှု', 'Create My First Goal': 'ပထမဆုံးရည်မှန်းချက် ဖန်တီးမည်', 'Change Goal': 'ရည်မှန်းချက်ပြောင်းမည်', 'Update Goal': 'ရည်မှန်းချက်အပ်ဒိတ်လုပ်မည်', 'Save Goal': 'ရည်မှန်းချက်သိမ်းမည်', 'Delete Goal?': 'ရည်မှန်းချက်ကို ဖျက်မည်လား', 'Goal Updated!': 'ရည်မှန်းချက် အပ်ဒိတ်လုပ်ပြီးပါပြီ', 'Goal Created!': 'ရည်မှန်းချက် ဖန်တီးပြီးပါပြီ',
  'Create my food': 'အစားအစာ ဖန်တီးမည်', 'Edit food': 'အစားအစာ ပြင်မည်', 'Save food': 'အစားအစာ သိမ်းမည်', 'Update food': 'အစားအစာ အပ်ဒိတ်လုပ်မည်', 'Food added': 'အစားအစာ ထည့်ပြီးပါပြီ', 'Create my exercise': 'လေ့ကျင့်ခန်း ဖန်တီးမည်', 'Edit exercise': 'လေ့ကျင့်ခန်း ပြင်မည်', 'Save exercise': 'လေ့ကျင့်ခန်း သိမ်းမည်', 'Update exercise': 'လေ့ကျင့်ခန်း အပ်ဒိတ်လုပ်မည်', 'Exercise added': 'လေ့ကျင့်ခန်း ထည့်ပြီးပါပြီ', 'My foods': 'ကျွန်ုပ်၏ အစားအစာများ', 'My exercises': 'ကျွန်ုပ်၏ လေ့ကျင့်ခန်းများ',
  'Already have an account?': 'အကောင့်ရှိပြီးသားလား', 'Don’t have an account?': 'အကောင့်မရှိသေးပါသလား', 'Sign in': 'ဝင်မည်', 'Create Account': 'အကောင့်ဖန်တီးမည်', 'Change Password': 'စကားဝှက်ပြောင်းမည်', 'Current password': 'လက်ရှိစကားဝှက်', 'New password': 'စကားဝှက်အသစ်', 'Confirm new password': 'စကားဝှက်အသစ် အတည်ပြုပါ', 'Update Profile': 'ပရိုဖိုင် အပ်ဒိတ်လုပ်မည်', 'Body Progress Images': 'ကိုယ်ခန္ဓာတိုးတက်မှုဓာတ်ပုံများ', 'Goal History': 'ရည်မှန်းချက်မှတ်တမ်း', 'No badges earned yet. Keep logging your goals and daily progress.': 'ဆုတံဆိပ် မရရှိသေးပါ။ ရည်မှန်းချက်နှင့် နေ့စဉ်တိုးတက်မှုကို ဆက်လက်မှတ်တမ်းတင်ပါ။',
};

const LanguageContext = createContext<{ language: Language; setLanguage: (language: Language) => void; t: (value: string) => string } | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => localStorage.getItem('fitpulse-language') === 'my' ? 'my' : 'en');
  const setLanguage = (next: Language) => { setLanguageState(next); localStorage.setItem('fitpulse-language', next); };
  const translate = (value: string) => {
    if (language === 'en') return value;
    return Object.entries(MYANMAR).sort(([a], [b]) => b.length - a.length).reduce((text, [english, myanmar]) => text.replaceAll(english, myanmar), value);
  };
  useEffect(() => {
    const originalText = new WeakMap<Text, string>();
    const originalAttributes = new WeakMap<Element, Record<string, string>>();
    const attributes = ['placeholder', 'title', 'aria-label'];
    let translating = false;
    const translateDom = () => {
      if (translating) return;
      translating = true;
      try {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const textNode = node as Text;
        if (!textNode.parentElement || ['SCRIPT', 'STYLE'].includes(textNode.parentElement.tagName)) continue;
        if (!originalText.has(textNode)) originalText.set(textNode, textNode.nodeValue || '');
        const nextText = translate(originalText.get(textNode) || '');
        if (textNode.nodeValue !== nextText) textNode.nodeValue = nextText;
      }
      document.body.querySelectorAll('*').forEach((element) => {
        const saved = originalAttributes.get(element) || {};
        attributes.forEach((attribute) => {
          const value = element.getAttribute(attribute);
          if (value !== null && saved[attribute] === undefined) saved[attribute] = value;
          if (saved[attribute] !== undefined) {
            const nextValue = translate(saved[attribute]);
            if (value !== nextValue) element.setAttribute(attribute, nextValue);
          }
        });
        originalAttributes.set(element, saved);
      });
      } finally {
        translating = false;
      }
    };
    translateDom();
    const observer = new MutationObserver(translateDom);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: attributes });
    return () => observer.disconnect();
  }, [language]);
  const value = useMemo(() => ({ language, setLanguage, t: translate }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}
