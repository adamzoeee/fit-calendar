// --- DTOs (mirroring DeepSeekModels.kt) ---

interface GenRequest {
  model: string;
  messages: Message[];
  temperature: number;
  max_tokens: number;
  stream: boolean;
}

interface Message {
  role: string;
  content: string;
}

interface GenResponse {
  choices: Choice[];
}

interface Choice {
  message: MessageContent;
}

interface MessageContent {
  content: string;
}

export interface ScheduleResponse {
  planName: string;
  days: DayDto[];
}

export interface DayDto {
  label: string;
  exercises: ExerciseDto[];
}

export interface ExerciseDto {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  muscleGroup: string;
  instructions: string;
}

// --- System Prompt ---

const SYSTEM_PROMPT = `你是一个专业的健身教练。请根据用户的描述，生成一个结构化的健身日程。

你必须严格按照以下 JSON 格式输出，不要包含任何额外的文字或 markdown：

{
  "planName": "计划名称",
  "days": [
    {
      "label": "Day 1 - 训练部位",
      "exercises": [
        {
          "name": "动作名称",
          "sets": 4,
          "reps": "8-12",
          "restSeconds": 90,
          "muscleGroup": "肌肉群",
          "instructions": "详细动作要点，包括起始姿势、运动轨迹、呼吸方式、注意事项"
        }
      ]
    }
  ]
}

规则：
1. days 数组长度等于分化天数（如五分化=5天，三分化=3天配休息日可以输出7天含休息标记）
2. 每个训练日 4-7 个动作
3. reps 用字符串表示，支持范围如 "8-12" 或递减如 "12,10,8"
4. instructions 至少 30 字，涵盖姿势、呼吸、安全要点
5. 如果有休息日，label 标注"休息日"，exercises 为空数组 []`;

// --- API Service ---

function extractJson(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    return text.substring(start, end + 1);
  }
  return text;
}

export async function generateSchedule(
  token: string,
  userPrompt: string
): Promise<ScheduleResponse> {
  const request: GenRequest = {
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 4096,
    stream: false,
  };

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API error ${response.status}: ${body}`);
  }

  const genResp: GenResponse = await response.json();
  const content = genResp.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from API');
  }

  const jsonBlock = extractJson(content);
  return JSON.parse(jsonBlock) as ScheduleResponse;
}
