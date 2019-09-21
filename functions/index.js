const admin = require('firebase-admin')
const functions = require('firebase-functions')
const axios = require('axios')

const cors = require('cors')({
  origin: true
})
admin.initializeApp(functions.config().firebase)
const db = admin.firestore()

const api = 'https://www.albion-online-data.com/api/v1/stats/prices'

// const localItems = require('../items.json')
// exports.initItems = functions.https.onRequest(async (req, res) => {
//   const promises = localItems.map(item => db.collection('items').doc(item.id).set(item))
//   await Promise.all(promises)
//   res.status(200).send({ success: true })
// })

exports.pricesByIds = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    if (!req.body.ids || req.body.ids.lenth === 0) {
      res.status(200).send({ items: [] })
      return
    }
    const response = await axios.get(`${api}/${req.body.ids.join(',')}`)
    const results = response.data.reduce((prices, current) => {
      if (!prices[current.item_id]) {
        prices[current.item_id] = { id: current.item_id, cities: [] }
      }
      prices[current.item_id].cities.push({
        name: current.city,
        price: current.sell_price_min,
        date: current.sell_price_min_date
      })
      return prices
    }, {})
    res.status(200).send({ items: Object.values(results) })
  })
})
