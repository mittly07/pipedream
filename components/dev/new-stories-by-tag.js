const dev_to = {
  type: "app",
  app: "dev_to",
}

const fetch = require('node-fetch')
const FeedParser = require('feedparser')
const hash = require('object-hash')

module.exports = {
  name: "dev-to-new-stories-by-tag",
  version: "0.0.1",
  props: {
    dev_to,
    timer: {
      type: "$.interface.timer",
      default: {
        intervalSeconds: 60 * 15,
      },
    },
    tag: {
      type: "string", 
      label: "Tag",
      description: "Tags to watch",
      optional: true,
      default: '',
    },
  },
  methods: {
    // in theory if alternate setting title and description or aren't unique this won't work
    itemKey(item) {
      return item.guid || item.id || hash(item)
    },
  },
  dedupe: "unique",
  async run() {
    const res = await fetch(`https://dev.to/feed/tag/${encodeURIComponent(this.tag)}`, {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36',
      accept: 'text/html,application/xhtml+xml',
    })
    if (res.status !== 200) throw new Error('Bad status code')
    const feedparser = new FeedParser({
      addmeta: false,
    })
    const items = []
    await new Promise((resolve, reject) => {
      feedparser.on('error', reject)
      feedparser.on('end', resolve)
      feedparser.on('readable', function() {
        let item
        while (item = this.read()) {
          for (const k in item) {
            if (item[`rss:${k}`]) {
              delete item[`rss:${k}`]
              continue
            }
            const o = item[k]
            if (o == null || (typeof o === 'object' && !Object.keys(o).length) || Array.isArray(o) && !o.length) {
              delete item[k]
              continue
            }
          }
          items.push(item)
        }
      })
      res.body.pipe(feedparser)
    })

    items.forEach(item=>{
      this.$emit(item, {
        id: this.itemKey(item),
        summary: item.title,
        ts: item.pubdate && +new Date(item.pubdate), 
      })
    })
  },
}
