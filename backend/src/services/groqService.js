import Groq from 'groq-sdk';

const getGroqClient = () => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }
  return new Groq({ apiKey });
};

const CANDIDATE_MODELS = [
  process.env.GROQ_MODEL,
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b'
].filter(Boolean);

/**
 * Clean up answer:
 * 1. Remove robotic openers like "Based on the provided course notes, "
 * 2. Strip scattered inline citations like [filename.pdf - Page X] from body sentences
 * 3. Ensure a clean References section is placed at the very end
 */
function refineAnswerFormat(rawAnswer, contextChunks) {
  let text = rawAnswer.trim();

  // 1. Remove robotic disclaimers at the start
  text = text.replace(/^(Based on the (provided|uploaded) (course |lecture )?(notes|materials)[\s\S]*?:|\s*According to the (provided|uploaded) (course |lecture )?(notes|materials)[\s\S]*?:)/i, '').trim();

  // 2. Identify inline citations like [285_OOPS lecture notes Complete.pdf - Page 19]
  const inlineCitationRegex = /\[([^\]]+\.(?:pdf|docx?|pptx?|txt))\s*[-–—]\s*(?:Page\s*)?(\d+)\]/gi;
  const detectedCitations = new Map();

  let match;
  while ((match = inlineCitationRegex.exec(text)) !== null) {
    const doc = match[1].trim();
    const page = parseInt(match[2], 10);
    if (!detectedCitations.has(doc)) {
      detectedCitations.set(doc, new Set());
    }
    detectedCitations.get(doc).add(page);
  }

  // Remove the inline bracketed citations from body text
  text = text.replace(inlineCitationRegex, '');
  // Clean up duplicate spaces on the same line without destroying newlines
  text = text.replace(/[^\S\r\n]{2,}/g, ' ');
  // Clean up space before punctuation
  text = text.replace(/[^\S\r\n]+([.,;:!?])/g, '$1');
  // Clean up spaces at end of lines
  text = text.replace(/[^\S\r\n]+$/gm, '');
  // Normalize excessive consecutive newlines to at most 2
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  // 3. Consolidate and cleanly format References section at the end
  const refHeaderRegex = /(?:---\s*\n+)?###\s*(📚\s*)?References[\s\S]*$/i;
  const rawRefMatch = text.match(refHeaderRegex);
  
  const refMap = new Map();

  // If detected citations were found inline
  detectedCitations.forEach((pages, doc) => {
    if (!refMap.has(doc)) refMap.set(doc, new Set());
    pages.forEach(p => refMap.get(doc).add(p));
  });

  if (rawRefMatch) {
    // Extract items from existing references block
    const existingRefLines = rawRefMatch[0].split('\n');
    for (const line of existingRefLines) {
      const matchLine = line.match(/\*\*(.+?)\*\*\s*[-–—]\s*Pages?\s*([0-9,\s]+)/i);
      if (matchLine) {
        const docName = matchLine[1].trim();
        const pages = matchLine[2].split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
        if (!refMap.has(docName)) refMap.set(docName, new Set());
        pages.forEach(p => refMap.get(docName).add(p));
      }
    }
    // Remove the raw references block so we can re-render a unified consolidated one
    text = text.replace(refHeaderRegex, '').trim();
  }

  // If still no references found, fall back to contextChunks
  if (refMap.size === 0 && contextChunks && contextChunks.length > 0) {
    contextChunks.forEach((c) => {
      if (!refMap.has(c.documentName)) refMap.set(c.documentName, new Set());
      refMap.get(c.documentName).add(c.pageNumber);
    });
  }

  // If the answer indicates notes do not contain information, do not add false references
  const isInsufficient = /do not contain sufficient|does not contain sufficient|not contain enough information|cannot be answered from the provided/i.test(text);

  if (!isInsufficient && refMap.size > 0) {
    let refSection = '\n\n---\n### 📚 References\n';
    refMap.forEach((pages, doc) => {
      const sortedPages = Array.from(pages).sort((a, b) => a - b);
      const pageLabel = sortedPages.length > 1 ? 'Pages' : 'Page';
      refSection += `- **${doc}** — ${pageLabel} ${sortedPages.join(', ')}\n`;
    });
    text += refSection;
  }

  return text.trim();
}

/**
 * Executes a Groq completion with automatic model fallback if a model is unavailable
 */
async function callGroqWithFallback(groq, completionParams) {
  let lastError = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await groq.chat.completions.create({
        ...completionParams,
        model
      });
      return response;
    } catch (err) {
      lastError = err;
      // If 404 (model not found), try the next candidate model
      if (err.status === 404 || err.message?.includes('model_not_found') || err.message?.includes('does not exist')) {
        console.warn(`[GroqService] Model '${model}' not accessible, trying fallback...`);
        continue;
      }
      // For rate limit (429), rethrow so it can be handled
      throw err;
    }
  }

  throw lastError || new Error('No compatible Groq model available.');
}

/**
 * Ask AI Teacher with grounded RAG context and honest fallback
 */
export const askAiTeacher = async ({ question, contextChunks, courseTitle }) => {
  const groq = getGroqClient();

  // If no Groq API Key, use simulated grounded response
  if (!groq) {
    return {
      answer: `[Demo Mode / Groq API Key Not Set]\nBased on your course notes (${courseTitle}), here is the relevant material retrieved:\n\n${
        contextChunks.length > 0
          ? contextChunks.map(c => `• ${c.content.substring(0, 150)}... [Page ${c.pageNumber}]`).join('\n')
          : 'No directly matching notes found.'
      }\n\nTo enable full AI Teacher answers, please add your GROQ_API_KEY to backend/.env!`,
      sources: contextChunks.map(c => ({
        documentName: c.documentName,
        pageNumber: c.pageNumber,
        preview: c.content.substring(0, 120)
      })),
      suggestedQuestions: [
        'Can you summarize the main concept?',
        'What are key definitions from this section?',
        'Give me an example from the notes.'
      ]
    };
  }

  // Format context for prompt
  const formattedContext = contextChunks
    .map(
      (c, i) =>
        `[Source ${i + 1} | File: ${c.documentName} | Page: ${c.pageNumber}]\n${c.content}`
    )
    .join('\n\n');

  const systemPrompt = `You are StudyMate AI Teacher, an elite, pedagogically gifted academic tutor with the clarity, depth, and refinement of ChatGPT.

Your mission is to provide exceptionally clear, accurate, well-structured, and easy-to-digest explanations grounded strictly in the student's uploaded course materials.

Response Guidelines:
1. Tone & Fluency:
   - Warm, articulate, encouraging, and natural like a master professor.
   - NEVER start with robotic disclaimers like "Based on the provided course notes," or "According to the uploaded documents,". Jump directly into explaining clearly and engagingly.
   - Do NOT produce unrendered asterisks or broken lists. Format cleanly with standard GitHub-flavored Markdown.

2. Structure & Visual Presentation:
   - Start with an intuitive high-level conceptual overview.
   - Use clean Markdown headings (e.g. ### 1. Built-in Types) to organize distinct sections.
   - Use clear bullet points with bold keywords (**Keyword:** explanation) for high readability.
   - Where helpful (especially for programming or technical subjects), provide clean syntax examples or short code snippets inside language-tagged code blocks (e.g. \`\`\`cpp ... \`\`\`).
   - If relevant, include a brief comparison, table, or "Key Takeaway" to deepen understanding.

3. Citation & References Rules (STRICT):
   - NEVER insert citations, bracketed tags, or source file references (like [Document.pdf - Page 19]) in the middle of sentences, paragraphs, or bullet points. The main body of your explanation MUST remain clean and fluent.
   - At the VERY END of your explanation (before SUGGESTIONS), include a clean References section formatted as:
     ---
     ### 📚 References
     - **<Document Name>** — Page <X>
   - All factual statements must be accurate to the uploaded course notes context. If the context does not contain enough information to address a question, state: "The uploaded course notes do not contain sufficient information to answer this specific question."

4. Suggested Follow-Up Questions:
   - Conclude your entire message with exactly 3 relevant follow-up questions formatted as:
SUGGESTIONS:
- Question 1?
- Question 2?
- Question 3?`;

  const userPrompt = `Course: ${courseTitle}

CONTEXT FROM COURSE NOTES:
${formattedContext || 'No notes available.'}

STUDENT QUESTION:
${question}

Answer the student's question clearly, thoroughly, and engagingly:`;

  try {
    const chatCompletion = await callGroqWithFallback(groq, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 1500
    });

    const fullResponse = chatCompletion.choices[0]?.message?.content || '';

    // Parse suggestions if present
    let answer = fullResponse;
    let suggestedQuestions = [];

    const suggestionsSplit = fullResponse.split(/SUGGESTIONS:/i);
    if (suggestionsSplit.length > 1) {
      answer = suggestionsSplit[0].trim();
      const rawSuggestions = suggestionsSplit[1].trim();
      suggestedQuestions = rawSuggestions
        .split('\n')
        .map(q => q.replace(/^[-*•\d\.\s]+/, '').trim())
        .filter(q => q.length > 5)
        .slice(0, 3);
    }

    // Refine formatting: remove scattered inline citations and ensure references at the end
    answer = refineAnswerFormat(answer, contextChunks);

    if (suggestedQuestions.length === 0) {
      suggestedQuestions = [
        'Can you clarify this with a simple code example?',
        'What are the key points I should remember for exams?',
        'How does this compare with related concepts in the course?'
      ];
    }

    const sources = contextChunks.map(c => ({
      documentName: c.documentName,
      pageNumber: c.pageNumber,
      preview: c.content.substring(0, 120)
    }));

    return {
      answer,
      sources,
      suggestedQuestions
    };
  } catch (error) {
    console.error('[Groq Error]', error);

    // If rate limited or quota issue
    if (error.status === 429 || error.message?.includes('rate limit')) {
      throw new Error('AI service quota reached or busy. Please wait a moment and try again.');
    }

    // Fallback: If AI fails, still provide grounded notes summary instead of a 500 error
    if (contextChunks.length > 0) {
      return {
        answer: `I encountered an issue connecting to the AI model (${error.message}). However, here is what your uploaded course materials say about this:\n\n${contextChunks
          .map(c => `• **[Page ${c.pageNumber}]**: ${c.content}`)
          .join('\n\n')}`,
        sources: contextChunks.map(c => ({
          documentName: c.documentName,
          pageNumber: c.pageNumber,
          preview: c.content.substring(0, 120)
        })),
        suggestedQuestions: [
          'Can you summarize the main concepts?',
          'What are key definitions from this section?'
        ]
      };
    }

    throw new Error(`AI Teacher error: ${error.message}`);
  }
};

/**
 * Generate Multiple Choice Questions from course notes
 */
export const generateQuizFromContent = async ({
  courseTitle,
  contextChunks,
  difficulty = 'medium',
  count = 5,
  focusTopic = null
}) => {
  const groq = getGroqClient();

  if (!groq) {
    return generateMockQuiz(courseTitle, count, difficulty, focusTopic);
  }

  const formattedContext = contextChunks
    .map(c => `[Page ${c.pageNumber}]: ${c.content}`)
    .join('\n\n')
    .substring(0, 10000);

  const systemPrompt = `You are an expert exam creator.
Your task is to generate a high quality multiple-choice quiz based strictly on the provided course material.
Difficulty: ${difficulty}.
Number of questions: ${count}.
${focusTopic ? `Special focus topic: "${focusTopic}".` : ''}

You must return ONLY a valid JSON array of objects with the exact following schema:
[
  {
    "question": "Clear question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Exact text of the correct option matching one of the options",
    "explanation": "Brief explanation citing why this is correct based on the material",
    "topic": "The specific topic or concept tag (e.g. Inheritance, Polymorphism, Encapsulation)"
  }
]
Do not wrap in markdown or backticks if possible, or return ONLY valid JSON.`;

  const userPrompt = `Course Title: ${courseTitle}

COURSE MATERIAL:
${formattedContext}

Generate ${count} multiple choice questions now:`;

  try {
    const completion = await callGroqWithFallback(groq, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.4,
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0]?.message?.content || '{}';
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    let questionsArray = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.quiz || []);

    if (!Array.isArray(questionsArray) || questionsArray.length === 0) {
      throw new Error('Invalid quiz response structure from AI.');
    }

    const sanitizedQuestions = questionsArray.map((q, idx) => {
      const options = Array.isArray(q.options) ? q.options.map(o => String(o).trim()) : [];
      let correctAnswer = String(q.correctAnswer || '').trim();
      
      if (['A', 'B', 'C', 'D'].includes(correctAnswer.toUpperCase()) && options.length >= 4) {
        const charIdx = correctAnswer.toUpperCase().charCodeAt(0) - 65;
        if (options[charIdx]) correctAnswer = options[charIdx];
      }

      if (!options.includes(correctAnswer) && options.length > 0) {
        correctAnswer = options[0];
      }

      return {
        question: q.question || `Question ${idx + 1}`,
        options: options.length >= 2 ? options : ['True', 'False'],
        correctAnswer: correctAnswer || (options[0] || 'True'),
        explanation: q.explanation || 'Refer to course notes.',
        topic: q.topic || focusTopic || 'General Concept'
      };
    });

    return sanitizedQuestions.slice(0, count);
  } catch (error) {
    console.warn('[Quiz Generation Error, falling back to mock]:', error.message);
    return generateMockQuiz(courseTitle, count, difficulty, focusTopic);
  }
};

/**
 * Generate targeted revision plan for weak topics
 */
export const generateRevisionGuide = async ({ courseTitle, weakTopics, contextChunks }) => {
  const groq = getGroqClient();

  if (!groq) {
    return {
      topic: weakTopics[0]?.topic || 'Key Concepts',
      summary: `Here is a review summary for ${weakTopics.map(t => t.topic).join(', ')}. Focus on core definitions and practice problems from your lecture slides.`,
      keyTakeaways: [
        'Review the key definitions and formulas on these topics',
        'Check the differences between fundamental principles',
        'Retake the practice quiz to solidify your understanding'
      ],
      recommendedAction: 'Practice quiz on these topics to test your retention.'
    };
  }

  const topicNames = weakTopics.map(w => `${w.topic} (Past Score: ${Math.round(w.percentage || 0)}%)`).join(', ');
  const formattedContext = contextChunks
    .map(c => `[Page ${c.pageNumber}]: ${c.content}`)
    .join('\n\n')
    .substring(0, 8000);

  const prompt = `You are an academic mentor.
A student scored low on the following topics in course "${courseTitle}":
${topicNames}

Relevant course material:
${formattedContext}

Please generate an targeted, structured revision guide in JSON with the following format:
{
  "topic": "${weakTopics[0]?.topic || 'Weak Topic'}",
  "summary": "Clear, concise 2-3 paragraph explanation simplifying the core concept they struggled with",
  "keyTakeaways": ["Key point 1", "Key point 2", "Key point 3", "Key point 4"],
  "commonPitfalls": "What students typically confuse or get wrong on this topic",
  "recommendedAction": "Actionable next step for the student"
}
Return ONLY valid JSON.`;

  try {
    const completion = await callGroqWithFallback(groq, {
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return parsed;
  } catch (error) {
    console.warn('[Revision Generation Error, falling back to summary]:', error.message);
    return {
      topic: weakTopics[0]?.topic || 'Review Topic',
      summary: `Review your notes for ${weakTopics.map(t => t.topic).join(', ')}. Pay special attention to foundational definitions and lecture examples.`,
      keyTakeaways: [
        'Read through the relevant pages in your uploaded course document',
        'Summarize the core mechanism in your own words',
        'Attempt practice questions'
      ],
      commonPitfalls: 'Overlooking edge cases and misremembering key terms.',
      recommendedAction: 'Retake a practice quiz focused on this topic.'
    };
  }
};

/**
 * Built-in mock quiz generator for development/offline testing
 */
function generateMockQuiz(courseTitle, count, difficulty, focusTopic) {
  const sampleTopics = focusTopic ? [focusTopic] : ['Core Principles', 'Definitions & Terms', 'Applications', 'Problem Solving'];
  const questions = [];

  for (let i = 1; i <= count; i++) {
    const topic = sampleTopics[(i - 1) % sampleTopics.length];
    questions.push({
      question: `Sample ${difficulty} question #${i} about ${topic} in ${courseTitle}?`,
      options: [
        `Primary concept A relating to ${topic}`,
        `Alternative theory B which has distinct attributes`,
        `Complementary mechanism C used in specific cases`,
        `Contrasting model D with different assumptions`
      ],
      correctAnswer: `Primary concept A relating to ${topic}`,
      explanation: `According to course materials on ${topic}, primary concept A directly addresses this phenomenon.`,
      topic: topic
    });
  }

  return questions;
}
