---
author: beto.group
version: 2.0.0
type: DatacoreEntry
---

```datacorejsx
const activeFile = dc.resolvePath("KEYCHAIN BRIDGE");
const folderPath = activeFile.substring(0, activeFile.lastIndexOf('/'));
const { View } = await dc.require(folderPath + "/src/index.jsx");
return await View({ folderPath });
```
