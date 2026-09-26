import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

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
  'Recommended plan for your selected goal': 'ရွေးချယ်ထားသော ရည်မှန်းချက်အတွက် အကြံပြုအစီအစဉ်', 'Selected goal': 'ရွေးချယ်ထားသော ရည်မှန်းချက်', 'These are practical starting suggestions, not medical advice. A qualified trainer or registered dietitian can personalize them.': 'ဤအရာများသည် စတင်ရန်အတွက် အကြံပြုချက်များသာဖြစ်ပြီး ဆေးဘက်ဆိုင်ရာအကြံဉာဏ် မဟုတ်ပါ။ ကျွမ်းကျင်သော Trainer သို့မဟုတ် Dietitian က သင့်အတွက် ကိုက်ညီအောင် ပြင်ဆင်ပေးနိုင်ပါသည်။',
  'Build body weight and strength with a controlled surplus.': 'ထိန်းချုပ်ထားသော ကယ်လိုရီပိုလျှံမှုဖြင့် ကိုယ်အလေးချိန်နှင့် ခွန်အားကို တိုးတက်စေပါ။', 'Prioritize lean mass with a small, controlled surplus.': 'သေးငယ်ပြီး ထိန်းချုပ်ထားသော ကယ်လိုရီပိုလျှံမှုဖြင့် ကြွက်သားထုကို ဦးစားပေးပါ။', 'Increase body weight gradually while monitoring progress.': 'တိုးတက်မှုကို စောင့်ကြည့်ရင်း ကိုယ်အလေးချိန်ကို တဖြည်းဖြည်းတိုးပါ။', 'Keep body weight stable while supporting training.': 'လေ့ကျင့်မှုကို ထောက်ပံ့ရင်း ကိုယ်အလေးချိန်ကို တည်ငြိမ်စွာ ထိန်းပါ။', 'Reduce body fat with a moderate deficit and high protein.': 'အလယ်အလတ် ကယ်လိုရီလျှော့ချမှုနှင့် ပရိုတင်းမြင့်မားမှုဖြင့် ကိုယ်တွင်းအဆီကို လျှော့ပါ။', 'Reduce body weight gradually without an aggressive deficit.': 'ပြင်းထန်သော ကယ်လိုရီလျှော့ချမှုမပြုဘဲ ကိုယ်အလေးချိန်ကို တဖြည်းဖြည်းလျှော့ပါ။',
  'Start at 10-20% above TDEE.': 'TDEE ထက် ၁၀-၂၀% ပို၍ စတင်ပါ။', 'Start at 10-15% above TDEE.': 'TDEE ထက် ၁၀-၁၅% ပို၍ စတင်ပါ။', 'Start close to TDEE.': 'TDEE နှင့် နီးစပ်သောပမာဏဖြင့် စတင်ပါ။', 'Start at 10-20% below TDEE.': 'TDEE ထက် ၁၀-၂၀% လျော့၍ စတင်ပါ။',
  'Use a steady calorie surplus and review weekly weight trends.': 'တည်ငြိမ်သော ကယ်လိုရီပိုလျှံမှုကို အသုံးပြုပြီး အပတ်စဉ် ကိုယ်အလေးချိန်လမ်းကြောင်းကို သုံးသပ်ပါ။', 'Build consistency with meal preparation and progressive training.': 'အစားအစာပြင်ဆင်မှုနှင့် တဖြည်းဖြည်းတိုးတက်သော လေ့ကျင့်မှုဖြင့် ပုံမှန်အလေ့အကျင့် တည်ဆောက်ပါ။', 'Review strength, energy, and measurements every 2 weeks.': '၂ ပတ်တိုင်း ခွန်အား၊ စွမ်းအင်နှင့် ကိုယ်တိုင်းတာချက်များကို သုံးသပ်ပါ။', 'Lean proteins such as chicken, fish, eggs, tofu, and Greek yogurt.': 'ကြက်သား၊ ငါး၊ ကြက်ဥ၊ တို့ဖူးနှင့် Greek yogurt ကဲ့သို့ အဆီနည်းပရိုတင်းများ။', 'Complex carbohydrates such as oats, rice, potatoes, and whole grains.': 'အုတ်စ်၊ ဆန်၊ အာလူးနှင့် အစေ့အဆန်များကဲ့သို့ ရှုပ်ထွေးကာဗိုဟိုက်ဒရိတ်များ။', 'Healthy fats and calorie-dense smoothies when appetite is low.': 'စားချင်စိတ်နည်းပါက ကျန်းမာသောအဆီနှင့် ကယ်လိုရီများသော smoothie များ။', 'Full-body resistance training 3 days per week.': 'တစ်ပတ်လျှင် ၃ ရက် ကိုယ်ခန္ဓာတစ်ခုလုံး အလေးခုခံလေ့ကျင့်မှု။', 'Prioritize squats, presses, rows, hinges, and gradual load increases.': 'Squat၊ Press၊ Row၊ Hinge လေ့ကျင့်ခန်းများနှင့် အလေးချိန်ကို တဖြည်းဖြည်းတိုးခြင်းကို ဦးစားပေးပါ။', 'Keep cardio light so it does not remove the planned calorie surplus.': 'သတ်မှတ်ထားသော ကယ်လိုရီပိုလျှံမှု မလျော့စေရန် cardio ကို ပေါ့ပေါ့ပါးပါးလုပ်ပါ။',
  'Follow a structured strength plan and track progressive overload.': 'စနစ်တကျ ခွန်အားလေ့ကျင့်မှုအစီအစဉ်ကို လိုက်နာပြီး progressive overload ကို မှတ်တမ်းတင်ပါ။', 'Keep meals consistent and review strength progress weekly.': 'အစားအစာများကို ပုံမှန်စားပြီး ခွန်အားတိုးတက်မှုကို အပတ်စဉ် သုံးသပ်ပါ။', 'Increase calories only after 2 weeks without progress.': 'တိုးတက်မှုမရှိဘဲ ၂ ပတ်ကြာမှသာ ကယ်လိုရီကို တိုးပါ။', 'High-quality protein at each meal to support muscle protein synthesis.': 'ကြွက်သားပရိုတင်းဖွဲ့စည်းမှုကို ထောက်ပံ့ရန် အစားအစာတိုင်းတွင် အရည်အသွေးမြင့် ပရိုတင်းစားပါ။', 'Rice, oats, potatoes, fruit, and other carbohydrates around training.': 'လေ့ကျင့်ချိန်အနီးတွင် ဆန်၊ အုတ်စ်၊ အာလူး၊ သစ်သီးနှင့် အခြားကာဗိုဟိုက်ဒရိတ်များ စားပါ။', 'Enough healthy fats from nuts, seeds, olive oil, and dairy.': 'အခွံမာသီး၊ အစေ့များ၊ သံလွင်ဆီနှင့် နို့ထွက်ပစ္စည်းများမှ ကျန်းမာသောအဆီ လုံလောက်စွာရယူပါ။', 'Strength training 3-5 days per week.': 'တစ်ပတ်လျှင် ၃-၅ ရက် ခွန်အားလေ့ကျင့်ပါ။', 'Prioritize compound movements and controlled technique.': 'compound လှုပ်ရှားမှုများနှင့် ထိန်းချုပ်ထားသော နည်းစနစ်ကို ဦးစားပေးပါ။', 'Allow recovery days and increase sets, reps, or load gradually.': 'ပြန်လည်နားယူရက်များ ထားရှိပြီး sets၊ reps သို့မဟုတ် အလေးချိန်ကို တဖြည်းဖြည်းတိုးပါ။',
  'Aim for a gradual 300-500 kcal surplus.': 'တဖြည်းဖြည်း ၃၀၀-၅၀၀ kcal ပိုလျှံမှုကို ရည်မှန်းပါ။', 'Use 5-6 smaller meals or snacks if large meals are difficult.': 'အစားအစာအများကြီးစားရန် ခက်ခဲပါက သေးငယ်သော အစားအစာ သို့မဟုတ် snack ၅-၆ ကြိမ်စားပါ။', 'Track strength, energy, and measurements instead of scale weight alone.': 'စကေးကိုယ်အလေးချိန်တစ်ခုတည်းမဟုတ်ဘဲ ခွန်အား၊ စွမ်းအင်နှင့် ကိုယ်တိုင်းတာချက်များကို မှတ်တမ်းတင်ပါ။', 'Lean proteins, full-fat dairy, eggs, and Greek yogurt.': 'အဆီနည်းပရိုတင်း၊ အဆီပြည့်နို့ထွက်ပစ္စည်း၊ ကြက်ဥနှင့် Greek yogurt။', 'Whole grains, rice, oats, and starchy vegetables.': 'အစေ့အဆန်များ၊ ဆန်၊ အုတ်စ်နှင့် ကစီဓာတ်ပါသော ဟင်းသီးဟင်းရွက်များ။', 'Milk, fruit, peanut butter, and whey smoothies for easy calories.': 'ကယ်လိုရီရလွယ်ရန် နို့၊ သစ်သီး၊ မြေပဲထောပတ်နှင့် whey smoothie များ။', 'Resistance training 3-4 times per week.': 'တစ်ပတ်လျှင် ၃-၄ ကြိမ် အလေးခုခံလေ့ကျင့်ပါ။', 'Use squats, deadlifts, push-ups, presses, and rows.': 'Squat၊ Deadlift၊ Push-up၊ Press နှင့် Row များကို အသုံးပြုပါ။', 'Keep cardio light or walk for recovery without excessive calorie burn.': 'ကယ်လိုရီအလွန်အကျွံ မလောင်ကျွမ်းစေရန် cardio ပေါ့ပေါ့ပါးပါး သို့မဟုတ် လမ်းလျှောက်ပါ။',
  'Set a consistent workout and meal-preparation schedule.': 'ပုံမှန်လေ့ကျင့်ခန်းနှင့် အစားအစာပြင်ဆင်ချိန်ဇယား သတ်မှတ်ပါ။', 'Use weekly weight averages rather than reacting to daily changes.': 'နေ့စဉ်ပြောင်းလဲမှုများအပေါ် တုံ့ပြန်မည့်အစား အပတ်စဉ်ပျမ်းမျှကိုယ်အလေးချိန်ကို အသုံးပြုပါ။', 'Adjust calories slightly after a 2-3 week trend.': '၂-၃ ပတ် လမ်းကြောင်းအပြီးတွင် ကယ်လိုရီကို အနည်းငယ်ချိန်ညှိပါ။', 'Build balanced plates with lean protein, complex carbohydrates, and healthy fats.': 'အဆီနည်းပရိုတင်း၊ ရှုပ်ထွေးကာဗိုဟိုက်ဒရိတ်နှင့် ကျန်းမာသောအဆီ ပါဝင်သော အာဟာရမျှတသည့်ပန်းကန် ပြင်ဆင်ပါ။', 'Use vegetables, fruit, oats, rice, potatoes, fish, eggs, tofu, and yogurt.': 'ဟင်းသီးဟင်းရွက်၊ သစ်သီး၊ အုတ်စ်၊ ဆန်၊ အာလူး၊ ငါး၊ ကြက်ဥ၊ တို့ဖူးနှင့် yogurt စားပါ။', 'Add carbohydrates before training and protein plus carbohydrates after training.': 'လေ့ကျင့်ခန်းမတိုင်မီ ကာဗိုဟိုက်ဒရိတ်နှင့် လေ့ကျင့်ခန်းအပြီး ပရိုတင်းနှင့် ကာဗိုဟိုက်ဒရိတ် ထည့်ပါ။', 'Add about 150 minutes of moderate cardio each week.': 'တစ်ပတ်လျှင် အလယ်အလတ် cardio မိနစ် ၁၅၀ ခန့် ထည့်ပါ။', 'Warm up 5-10 minutes and cool down after sessions.': 'လေ့ကျင့်ခန်းမတိုင်မီ ၅-၁၀ မိနစ် warm-up ပြုလုပ်ပြီး အပြီးတွင် cool-down လုပ်ပါ။',
  'Aim for gradual loss of about 0.5-1 kg per week.': 'တစ်ပတ်လျှင် ၀.၅-၁ ကီလိုဂရမ်ခန့် တဖြည်းဖြည်းလျှော့ရန် ရည်မှန်းပါ။', 'Track portions and steps consistently instead of using aggressive restrictions.': 'ပြင်းထန်သော ကန့်သတ်မှုများအစား အစားအစာပမာဏနှင့် ခြေလှမ်းများကို ပုံမှန်မှတ်တမ်းတင်ပါ။', 'Protect sleep and stress management to support adherence.': 'လိုက်နာနိုင်ရန် အိပ်စက်မှုနှင့် စိတ်ဖိစီးမှုကို ကောင်းစွာစီမံပါ။', 'Fill half the plate with vegetables, plus lean protein and complex carbohydrates.': 'ပန်းကန်တစ်ဝက်ကို ဟင်းသီးဟင်းရွက်ဖြင့်ဖြည့်ပြီး အဆီနည်းပရိုတင်းနှင့် ရှုပ်ထွေးကာဗိုဟိုက်ဒရိတ် ထည့်ပါ။', 'Choose oats, rice, quinoa, potatoes, chicken, fish, tofu, and legumes.': 'အုတ်စ်၊ ဆန်၊ quinoa၊ အာလူး၊ ကြက်သား၊ ငါး၊ တို့ဖူးနှင့် ပဲမျိုးစုံ ရွေးချယ်ပါ။', 'Include measured portions of avocado, nuts, seeds, and olive oil.': 'ထောပတ်သီး၊ အခွံမာသီး၊ အစေ့နှင့် သံလွင်ဆီကို သင့်တော်သောပမာဏဖြင့် ထည့်ပါ။', 'Cardio about 150 minutes per week.': 'တစ်ပတ်လျှင် cardio မိနစ် ၁၅၀ ခန့်လုပ်ပါ။', 'Strength training 2-3 days per week.': 'တစ်ပတ်လျှင် ၂-၃ ရက် ခွန်အားလေ့ကျင့်ပါ။', 'Add daily movement such as walking, stairs, and household activity.': 'လမ်းလျှောက်ခြင်း၊ လှေကားတက်ခြင်းနှင့် အိမ်မှုကိစ္စများကဲ့သို့ နေ့စဉ်လှုပ်ရှားမှု ထည့်ပါ။',
  'Target a safe 0.5-1 kg weekly loss with long-term habits.': 'ရေရှည်အလေ့အကျင့်များဖြင့် တစ်ပတ်လျှင် ဘေးကင်းသော ၀.၅-၁ ကီလိုဂရမ် လျှော့ရန် ရည်မှန်းပါ။', 'Use a moderate deficit near 500 kcal rather than a crash diet.': 'အလွန်အမင်း diet အစား ၅၀၀ kcal ခန့် အလယ်အလတ်လျှော့ချမှုကို အသုံးပြုပါ။', 'Keep a daily food and activity journal to review progress.': 'တိုးတက်မှုကို သုံးသပ်ရန် နေ့စဉ်အစားအစာနှင့် လှုပ်ရှားမှုမှတ်တမ်း ထားပါ။', 'Prioritize lean proteins such as chicken, fish, beans, and low-fat dairy.': 'ကြက်သား၊ ငါး၊ ပဲနှင့် အဆီနည်းနို့ထွက်ပစ္စည်းများကဲ့သို့ အဆီနည်းပရိုတင်းကို ဦးစားပေးပါ။', 'Fill half the plate with vegetables and fruit, plus whole grains.': 'ပန်းကန်တစ်ဝက်ကို ဟင်းသီးဟင်းရွက်နှင့် သစ်သီးဖြင့်ဖြည့်ပြီး အစေ့အဆန်များ ထည့်ပါ။', 'Limit added sugar, highly processed snacks, excess sodium, and trans fats.': 'ထပ်ထည့်သကြား၊ ပြုပြင်ထားသော snack များ၊ ဆားပိုလျှံမှုနှင့် trans fat များကို ကန့်သတ်ပါ။', 'At least 150 minutes of moderate aerobic activity weekly.': 'တစ်ပတ်လျှင် အလယ်အလတ် aerobic လှုပ်ရှားမှု အနည်းဆုံး မိနစ် ၁၅၀ ပြုလုပ်ပါ။', 'Strength training at least 2 days per week.': 'တစ်ပတ်လျှင် အနည်းဆုံး ၂ ရက် ခွန်အားလေ့ကျင့်ပါ။', 'Stay active daily with steps, stairs, walking, or cycling.': 'ခြေလှမ်း၊ လှေကား၊ လမ်းလျှောက်ခြင်း သို့မဟုတ် စက်ဘီးစီးခြင်းဖြင့် နေ့စဉ်လှုပ်ရှားနေပါ။',
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
  'Skinny → Fit': 'ပိန်မှ ကြံ့ခိုင်ရန်', 'Muscle Gain': 'ကြွက်သားတိုးရန်', 'Weight Gain': 'ကိုယ်အလေးချိန်တိုးရန်', 'Fit / Maintain': 'ကြံ့ခိုင်မှု ထိန်းသိမ်းရန်', 'Fat Loss': 'ကိုယ်တွင်းအဆီလျှော့ရန်', 'Weight Loss': 'ကိုယ်အလေးချိန်လျှော့ရန်',
  'Sedentary — Little/no exercise (1.20x)': 'လှုပ်ရှားမှုနည်း — လေ့ကျင့်ခန်းမရှိ/နည်း (၁.၂၀x)', 'Lightly Active — Light exercise 1–3 days/week (1.375x)': 'အနည်းငယ်လှုပ်ရှား — တစ်ပတ် ၁-၃ ရက် ပေါ့ပါးလေ့ကျင့်ခန်း (၁.၃၇၅x)', 'Moderately Active — Moderate exercise 3–5 days/week (1.55x)': 'အလယ်အလတ်လှုပ်ရှား — တစ်ပတ် ၃-၅ ရက် လေ့ကျင့်ခန်း (၁.၅၅x)', 'Very Active — Hard exercise 6–7 days/week (1.725x)': 'အလွန်လှုပ်ရှား — တစ်ပတ် ၆-၇ ရက် ပြင်းထန်လေ့ကျင့်ခန်း (၁.၇၂၅x)', 'Extremely Active — Very hard exercise, physical job (1.90x)': 'အလွန်အမင်းလှုပ်ရှား — ပြင်းထန်လေ့ကျင့်ခန်း/ကိုယ်ကာယအလုပ် (၁.၉၀x)',
};

const LanguageContext = createContext<{ language: Language; setLanguage: (language: Language) => void; t: (value: string) => string } | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => localStorage.getItem('fitpulse-language') === 'my' ? 'my' : 'en');
  const setLanguage = (next: Language) => { setLanguageState(next); localStorage.setItem('fitpulse-language', next); };
  const translate = (value: string) => {
    if (language === 'en') return value;
    return Object.entries(MYANMAR).sort(([a], [b]) => b.length - a.length).reduce((text, [english, myanmar]) => text.replaceAll(english, myanmar), value);
  };
  const originalTextRef = useRef(new WeakMap<Text, string>());
  const translatedTextRef = useRef(new WeakMap<Text, string>());
  const originalAttributesRef = useRef(new WeakMap<Element, Record<string, string>>());
  const translatedAttributesRef = useRef(new WeakMap<Element, Record<string, string>>());
  useEffect(() => {
    const originalText = originalTextRef.current;
    const translatedText = translatedTextRef.current;
    const originalAttributes = originalAttributesRef.current;
    const translatedAttributes = translatedAttributesRef.current;
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
        const currentText = textNode.nodeValue || '';
        const previousTranslation = translatedText.get(textNode);
        if (!originalText.has(textNode) || (previousTranslation !== undefined && currentText !== previousTranslation)) {
          originalText.set(textNode, currentText);
        }
        const nextText = translate(originalText.get(textNode) || '');
        if (currentText !== nextText) textNode.nodeValue = nextText;
        translatedText.set(textNode, nextText);
      }
      document.body.querySelectorAll('*').forEach((element) => {
        const saved = originalAttributes.get(element) || {};
        const translated = translatedAttributes.get(element) || {};
        attributes.forEach((attribute) => {
          const value = element.getAttribute(attribute);
          if (value !== null && saved[attribute] === undefined) saved[attribute] = value;
          if (value !== null && translated[attribute] !== undefined && value !== translated[attribute]) saved[attribute] = value;
          if (saved[attribute] !== undefined) {
            const nextValue = translate(saved[attribute]);
            if (value !== nextValue) element.setAttribute(attribute, nextValue);
            translated[attribute] = nextValue;
          }
        });
        originalAttributes.set(element, saved);
        translatedAttributes.set(element, translated);
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
