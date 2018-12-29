const path = require('path')
const { format } = require('date-fns')
module.exports = {
  name: 'today',
  run: async toolbox => {
    let keys
    const { filesystem, prompt, print, http } = toolbox
    const askAuth = async () => {
      return await prompt.ask([
        { type: 'input', name: 'user', message: 'Input your gitlab user name (email prefix)' },
        { type: 'input', name: 'token', message: 'Input your gitlab private key (save in your disk, no networks)' }
      ])
    }
    const configFile = path.join(filesystem.homedir(), '.gitlabrc')
    try {
      if (filesystem.exists(configFile)) {
        keys = await filesystem.read(configFile, 'json')
        print.info('Get keys from local')
      } else {
        keys = await askAuth()
      }
    } catch (e) {
      print.error(e)
    }
    const api = http.create({
      baseURL: 'https://git.mail.netease.com',
      headers: { 'PRIVATE-TOKEN': keys.token }
    })
    try {
      const res = await api.get(`/users/${keys.user}/calendar.json`)
      if (!res.ok) {
        print.error(res.data && res.data.error || 'request error, retry again')
        await filesystem.remove(configFile)
        process.exit(-1)
      } else {
        const dataList = res.data
        const todayStr = format(new Date(), 'YYYY-MM-DD')
        const result = +dataList[todayStr]
        await filesystem.write(configFile, keys)
        if (result >= 30) {
          print.success('今儿写了很多了，回家休息吧')
        } else if (result < 10) {
          print.error('今儿写的有点少，只有' + result + '次提交，再写点啥？')
        } else {
          print.info('今天提交了 ', result, ' 次')
        }
      }

    } catch (e) {
      print.error(e)
    }
  }
}
