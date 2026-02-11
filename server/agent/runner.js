import { exec } from 'child_process';

const bash = ({ command }) => {
  return new Promise((resolve) => {
    exec(command, { timeout: 30000, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        resolve(`exit code ${err.code}\n${stderr || err.message}`);
        return;
      }
      resolve(stdout || stderr || '(no output)');
    });
  });
};

const toolMap = { bash };

export const runTools = async (toolCalls) => {
  const results = await Promise.all(toolCalls.map(async (tc) => {
    const name = tc.function.name;
    const args = JSON.parse(tc.function.arguments || '{}');

    let content;
    try {
      const fn = toolMap[name];
      if (!fn) throw new Error(`未知工具: ${name}`);
      content = await fn(args);
    } catch (e) {
      content = `tool error: ${e.message}`;
    }

    return {
      role: 'tool',
      tool_call_id: tc.id,
      content: typeof content === 'string' ? content : JSON.stringify(content)
    };
  }));

  return results;
};
