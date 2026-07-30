# Core Coding Standards

## Files
- One responsibility per file
- Export named exports only (no default exports except main.js entry)
- File names: kebab-case

## Functions
- Max 30 lines per function — split if longer
- Pure functions where possible (no side effects)
- JSDoc on every exported function with @param and @returns

## Devlog
- For each new chat thread started, maintain a .md file under devlog folder. As the chat evolves, keep updaring the file with a rich documentation of what were the objectives of tasks in that thread, what did I change and why, what was the outcome and what did I learn new from it. 
- After each milestone: write a short devlog_milestone_x.md entry in the devlog folder summarizing all the changes done since the previous milestone.
- Take questions asked by me in chats with AI agent as a reference on what I'm learning
- Keep the devlogs length less than 500 words broken down in paragraphs. use bullet points or table only when needed.
- Write in first person from my perspective (I realized.. I changed..). It is okay to mention that I used AI for certain tasks. Make the writing look human and not AI written, no em dashes, add a bit of matrix references and humor but not too much.