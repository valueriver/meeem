export const tools = [
  {
    type: 'function',
    function: {
      name: 'bash',
      description: '执行 bash 命令，可以运行任意 shell 命令并返回输出结果',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: '要执行的 bash 命令'
          },
          reason: {
            type: 'string',
            description: '简要说明执行此命令的原因'
          }
        },
        required: ['command', 'reason']
      }
    }
  }
];
