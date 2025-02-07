/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const mediaPath = `${__dirname}/media`;

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function startChat(history) {
  return model.startChat({ history });
}

async function sendMessage(chat, message) {
  const result = await chat.sendMessage(message);
  console.log(result.response.text());
}

async function sendMessageStream(chat, message) {
  const result = await chat.sendMessageStream(message);
  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    process.stdout.write(chunkText);
  }
}

async function chat() {
  const history = [
    { role: "user", parts: [{ text: "Hello" }] },
    { role: "model", parts: [{ text: "Great to meet you. What would you like to know?" }] }
  ];
  const chat = await startChat(history);
  
  await sendMessage(chat, "I have 2 dogs in my house.");
  await sendMessage(chat, "How many paws are in my house?");
}

async function chatStreaming() {
  const history = [
    { role: "user", parts: [{ text: "Hello" }] },
    { role: "model", parts: [{ text: "Great to meet you. What would you like to know?" }] }
  ];
  const chat = await startChat(history);

  await sendMessageStream(chat, "I have 2 dogs in my house.");
  await sendMessageStream(chat, "How many paws are in my house?");
}

async function chatStreamingWithImages() {
  const history = [
    { role: "user", parts: [{ text: "Hello, I'm designing inventions. Can I show you one?" }] }
  ];
  const chat = await startChat(history);

  await sendMessageStream(chat, "Hello, I'm designing inventions. Can I show you one?");
  
  const imageData = {
    inlineData: {
      data: Buffer.from(fs.readFileSync(`${mediaPath}/jetpack.jpg`)).toString("base64"),
      mimeType: "image/jpeg",
    },
  };
  
  await sendMessageStream(chat, ["What do you think about this design?", imageData]);
}

async function runAll() {
  // Comment out or delete any sample cases you don't want to run.
  await chat();
  await chatStreaming();
  await chatStreamingWithImages();
}

runAll();
