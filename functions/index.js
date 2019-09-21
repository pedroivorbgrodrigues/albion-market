const admin = require('firebase-admin')
const functions = require('firebase-functions')
const axios = require('axios')
const { differenceInDays } = require('date-fns')

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
const allowedCities = ['Black Market', 'Caerleon', 'Bridgewatch', 'Fort Sterling', 'Lymhurst', 'Thetford', 'Martlock']

const groupCitiesByItemId = (period, prices, current) => {
  if (!prices[current.item_id]) {
    prices[current.item_id] = { id: current.item_id, cities: [] }
  }
  const diff = differenceInDays(new Date(), new Date(current.sell_price_min_date))
  if (allowedCities.includes(current.city) && diff <= period) {
    prices[current.item_id].cities.push({
      name: current.city,
      price: current.sell_price_min,
      date: current.sell_price_min_date
    })
  }
  return prices
}

const calculateTravels = (travels, city, index, sorted) => {
  if (index > 0) {
    const rentability = (city.price / sorted[0].price - 1) * 100
    travels.push({
      from: sorted[0].name,
      to: city.name,
      rentability: rentability.toFixed(2),
      profit: city.price - sorted[0].price
    })
  }
  return travels
}

const processResult = (results) => {
  const processedItems = Object.values(results).filter(item => item.cities.length >= 2)
    .map(item => {
      const sorted = item.cities.sort((a, b) => a.price - b.price)
      const travels = sorted.reduce(calculateTravels, [])
      const sortedTravels = travels.sort((a, b) => b.rentability - a.rentability)
      return { ...item, travels: sortedTravels }
    })
  const sorted = processedItems.sort((a, b) => b.travels.rentability - a.travels[0].rentability)
  return sorted
}

exports.pricesByIds = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    if (!req.body.ids || req.body.ids.lenth === 0) {
      res.status(200).send({ items: [] })
      return
    }
    try {
      const response = await axios.get(`${api}/${req.body.ids.join(',')}`)
      const period = parseInt(req.body.period) || 1
      const groupedItems = response.data.reduce(groupCitiesByItemId.bind(this, period), {})
      const processedItems = processResult(groupedItems)
      res.status(200).send({ items: processedItems })
    } catch (error) {
      res.status(500).send({ error: error.toString() })
    }
  })
})
