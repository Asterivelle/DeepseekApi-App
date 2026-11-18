const { contextBridge } = require('electron')

// 渲染进程不需要 Node 能力，只暴露只读的运行时信息。
contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
})
