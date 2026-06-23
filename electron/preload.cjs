const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('matai', {
  platform: process.platform,
})
