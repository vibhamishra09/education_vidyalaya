import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";
import process from 'node:process';

export function handleSummary(data) {
  return {
    "report.html": htmlReport(data),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}

export let options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 25 },
    { duration: '30s', target: 50 },
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: [
      'p(50)<300',
      'p(90)<700',
      'p(95)<800',
      'p(99)<1000'
    ],
    checks: ['rate>0.98'],
  },
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
  { name: "Arabic", expected: "YES" },
  { name: "Excel", expected: "YES" },
  { name: "Accounting", expected: "YES" },
  { name: "Digital Marketing", expected: "YES" },
  { name: "SEO", expected: "YES" },
  { name: "Email Marketing", expected: "YES" },
  { name: "Bookkeeping", expected: "YES" },
  { name: "Sales", expected: "YES" },
  { name: "Customer Support", expected: "YES" },
  { name: "Swimming", expected: "YES" },
  { name: "Thinking", expected: "YES" },
  { name: "Focus", expected: "YES" },
  { name: "Discipline", expected: "YES" },
  { name: "Motivation", expected: "YES" },
  { name: "Weightlifting", expected: "YES" },
  { name: "Running", expected: "YES" },
  { name: "Bodybuilding", expected: "YES" },
  { name: "Wrestling", expected: "YES" },
  { name: "asdfgh", expected: "NO" },
  { name: "xyzabc", expected: "NO" },
  { name: "qwertpoi", expected: "NO" },
  { name: "zzzzzz", expected: "NO" },
  { name: "ajskdlf", expected: "NO" },
  { name: "hello", expected: "NO" },
  { name: "hi", expected: "NO" },
  { name: "ok", expected: "NO" },
  { name: "first", expected: "NO" },
  { name: "firsttime", expected: "NO" },
  { name: "skill", expected: "NO" },
  { name: "newskill", expected: "NO" },
  { name: "nothing", expected: "NO" },
  { name: "Murder", expected: "NO" },
  { name: "Hacking Bank", expected: "NO" },
  { name: "Stealing", expected: "NO" },
  { name: "%%%%%", expected: "NO" },
  { name: "123123", expected: "NO" },
  { name: "@@@@@", expected: "NO" },
  { name: "......", expected: "NO" },
];

export default function () {
  const item = skills[Math.floor(Math.random() * skills.length)];
  const skillName = item.name.trim();

  const url = `http://${process.env.OLLAMA_PROXY_URL}/classify`;

  const res = http.post(
    url,
    JSON.stringify({ skill: skillName }),
    {
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.SKILLS_API,
      },
    }
  );

  let modelAnswer = "ERROR";
  try {
    const body = JSON.parse(res.body);
    
    modelAnswer = body.label[0] === "YES" ? "YES" : "NO";
  } catch (e) {
    modelAnswer = "ERROR";
  }

  check(res, {
    'status is 200': (r) => r.status === 200,
    'correct classification': () => modelAnswer === item.expected,
  });

  if (modelAnswer !== item.expected) {
    console.log(`Mismatch | Skill=${item.name} | Expected=${item.expected} | Got=${modelAnswer}`);
  }

  sleep(0.1);
}