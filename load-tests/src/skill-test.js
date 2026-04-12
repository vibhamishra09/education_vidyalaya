import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

export function handleSummary(data) {
  return {
    "report.html": htmlReport(data),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}


export let options = {
  vus: 5,
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: [
      'p(50)<2500',
      'p(90)<4500',
      'p(95)<5500',
      'p(99)<9000'],
    checks: ['rate>0.95'],
  },
   stages: [
    { duration: '30s', target: 1 },
    { duration: '30s', target: 2 },
    { duration: '30s', target: 4 },
    { duration: '30s', target: 6 },
    { duration: '30s', target: 8 },
    { duration: '30s', target: 0 },
  ]
};

const skills = [
  { name: "JavaScript", expected: "YES" },
  { name: "TypeScript", expected: "YES" },
  { name: "Python", expected: "YES" },
  { name: "Java", expected: "YES" },
  { name: "C++", expected: "YES" },
  { name: "Node.js", expected: "YES" },
  { name: "React", expected: "YES" },
  { name: "Angular", expected: "YES" },
  { name: "AWS", expected: "YES" },
  { name: "Docker", expected: "YES" },
  { name: "Kubernetes", expected: "YES" },
  { name: "Machine Learning", expected: "YES" },
  { name: "Data Science", expected: "YES" },
  { name: "SQL", expected: "YES" },
  { name: "MongoDB", expected: "YES" },
  { name: "Maths", expected: "YES" },
  { name: "Physics", expected: "YES" },
  { name: "Chemistry", expected: "YES" },
  { name: "Biology", expected: "YES" },
  { name: "History", expected: "YES" },
  { name: "Geography", expected: "YES" },
  { name: "Economics", expected: "YES" },
  { name: "Statistics", expected: "YES" },
  { name: "Algebra", expected: "YES" },
  { name: "Calculus", expected: "YES" },
  { name: "Leadership", expected: "YES" },
  { name: "Communication", expected: "YES" },
  { name: "Negotiation", expected: "YES" },
  { name: "Public Speaking", expected: "YES" },
  { name: "Project Management", expected: "YES" },
  { name: "Time Management", expected: "YES" },
  { name: "Critical Thinking", expected: "YES" },
  { name: "Problem Solving", expected: "YES" },
  { name: "Teamwork", expected: "YES" },
  { name: "Decision Making", expected: "YES" },
  { name: "Graphic Design", expected: "YES" },
  { name: "UI Design", expected: "YES" },
  { name: "Video Editing", expected: "YES" },
  { name: "Photography", expected: "YES" },
  { name: "Music Theory", expected: "YES" },
  { name: "Drawing", expected: "YES" },
  { name: "Animation", expected: "YES" },
  { name: "Content Writing", expected: "YES" },
  { name: "Copywriting", expected: "YES" },
  { name: "Storytelling", expected: "YES" },
  { name: "English", expected: "YES" },
  { name: "Hindi", expected: "YES" },
  { name: "French", expected: "YES" },
  { name: "German", expected: "YES" },
  { name: "Spanish", expected: "YES" },
  { name: "Sanskrit", expected: "YES" },
  { name: "Japanese", expected: "YES" },
  { name: "Excel", expected: "YES" },
  { name: "Accounting", expected: "YES" },
  { name: "Digital Marketing", expected: "YES" },
  { name: "SEO", expected: "YES" },
  { name: "Email Marketing", expected: "YES" },
  { name: "Bookkeeping", expected: "YES" },
  { name: "Sales", expected: "YES" },
  { name: "Customer Support", expected: "YES" },
  { name: "Swimming", expected: "YES" },
  { name: "Weightlifting", expected: "YES" },
  { name: "Running", expected: "YES" },
  { name: "Bodybuilding", expected: "YES" },
  { name: "Wrestling", expected: "YES" },
  { name: "Thinking", expected: "YES" },
  { name: "Focus", expected: "YES" },
  { name: "Discipline", expected: "YES" },
  { name: "Motivation", expected: "YES" },
  { name: "Confidence", expected: "YES" },
  { name: "asdfgh", expected: "NO" },
  { name: "xyzabc", expected: "NO" },
  { name: "qwertpoi", expected: "NO" },
  { name: "zzzzzz", expected: "NO" },
  { name: "ajskdlf", expected: "NO" },
  { name: "hello", expected: "NO" },
  { name: "hi", expected: "NO" },
  { name: "ok", expected: "NO" },
  { name: "nothing", expected: "NO" },
  { name: "Murder", expected: "NO" },
  { name: "Bomb Making", expected: "NO" },
  { name: "Hacking Bank", expected: "NO" },
  { name: "Stealing", expected: "NO" },
  { name: "Violence", expected: "NO" },
  { name: "%%%%%", expected: "NO" },
  { name: "123123", expected: "NO" },
  { name: "@@@@@", expected: "NO" },
  { name: "......", expected: "NO" },
  { name: "     ", expected: "NO" },
];

export default function () {
  const item = skills[Math.floor(Math.random() * skills.length)];
  const skillName = item.name.trim() || "[blank]";

  const payload = JSON.stringify({
    model: "gemma3:1b",
    prompt: `You are a spam filter for an edtech skill input. Reply YES or NO only.

        Say YES if the input is any real word, concept, subject, language, technology, sport, or skill — even vague ones like "Focus" or "Discipline".

        Say NO only if the input is:
        - Random letters with no meaning: asdfgh, xyzabc, qwertpoi, ajskdlf, zzzzzz
        - Symbols or digits only: @@@@@, %%%%%, 123123, ......
        - Blank or only spaces
        - A greeting or filler: hello, hi, ok, nothing, skill, newskill, firsttime, first
        - Meaning less words like hello, bye, first, seconds, skill, noskill
        - Harmful or illegal: Murder, Bomb Making, Hacking Bank, Violence, Stealing

        Examples:
        "Python" → YES
        "Docker" → YES
        "Kubernetes" → YES
        "Angular" → YES
        "MongoDB" → YES
        "Sanskrit" → YES
        "Bookkeeping" → YES
        "Copywriting" → YES
        "Confidence" → YES
        "Bodybuilding" → YES
        "asdfgh" → NO
        "@@@@@" → NO
        "hello" → NO
        "Murder" → NO
        "123123" → NO

        Skill: "${skillName}"
        Answer:`,
            stream: false,
            keep_alive: "-1m",
            options: {
            num_predict: 3,
            temperature: 0,   
            num_ctx: 1024,      
            top_k: 1,
            },
        });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.OLLAMA_API_KEY,
    },
  };

  const res = http.post(`http://${process.env.OLLAMA_PROXY_URL}/api/generate`, payload, params);

  let modelAnswer = "";
  try {
    const body = JSON.parse(res.body);
    const raw = (body.response || "").toUpperCase();
    const match = raw.match(/\b(YES|NO)\b/);
    modelAnswer = match ? match[1] : "";
  } catch (e) {
    console.log("<----------------- INVALID OUTPUT --------------------->");
    modelAnswer = "";
  }

  check(res, {
    'status is 200': (r) => r.status === 200,
    'valid YES/NO output': () => modelAnswer === "YES" || modelAnswer === "NO",
    'correct classification': () => modelAnswer === item.expected,
  });

  if (modelAnswer !== item.expected) {
    console.log(`Mismatch | Skill=${item.name} | Expected=${item.expected} | Got=${modelAnswer}`);
  }

}