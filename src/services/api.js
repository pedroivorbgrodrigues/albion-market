import axios from 'axios'
import localItems from './items.json'

const api = 'https://www.albion-online-data.com/api/v1/stats/prices'

const { differenceInDays } = require('date-fns')
const allowedCities = ['Black Market', 'Caerleon', 'Bridgewatch', 'Fort Sterling', 'Lymhurst', 'Thetford', 'Martlock']

const getItems = () => {
  return localItems
}

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

const rentabilityOutlier = 400
const profitOutlier = 200000
const calculateTravels = (travels, city, index, sorted) => {
  if (index > 0) {
    let rentability = (city.price / sorted[0].price - 1) * 100
    const profit = city.price - sorted[0].price
    if (rentability > rentabilityOutlier && profit > profitOutlier) {
      rentability = 0
    }
    travels.push({
      from: sorted[0].name,
      to: city.name,
      rentability: rentability.toFixed(2),
      profit: profit
    })
  }
  return travels
}

const processResult = (results) => {
  const items = getItems()
  const processedItems = Object.values(results).filter(item => item.cities.length >= 2)
    .map(item => {
      const sorted = item.cities.sort((a, b) => a.price - b.price)
      const travels = sorted.reduce(calculateTravels, [])
      const sortedTravels = travels.sort((a, b) => b.rentability - a.rentability)
      const name = items.find(i => i.id === item.id).name
      return { ...item, travels: sortedTravels, name }
    })
  return processedItems
}

const sortByTravels = (items) => {
  return items.sort((a, b) => b.travels[0].rentability - a.travels[0].rentability)
}

const pricesByIds = async (ids, period, sorted = true) => {
  try {
    const response = await axios.get(`${api}/${ids.join(',')}`)
    const groupedItems = response.data.reduce(groupCitiesByItemId.bind(this, period), {})
    const processedItems = processResult(groupedItems)
    return sorted ? sortByTravels(processedItems) : processedItems
  } catch (error) {
    return []
  }
}

const processAllPrices = async (period) => {
  let index = 0
  const batchSize = 100
  const batches = []
  const items = getItems()
  while (index <= items.length) {
    const batch = items.slice(index, index + batchSize)
    batches.push(batch.map(item => item.id))
    index += batchSize
  }
  const promises = batches.map(batchIds => pricesByIds(batchIds, period, false))
  const results = await Promise.all(promises)
  const mergedResults = Array.prototype.concat.apply([], results)
  const sortedResult = sortByTravels(mergedResults)
  return sortedResult
}

const storageKey = 'findBestPrices'
const findBestPrices = async (period) => {
  const cachedJSON = localStorage.getItem(storageKey)
  const now = new Date()
  if (cachedJSON != null) {
    const cached = JSON.parse(cachedJSON)
    const diff = differenceInDays(now, new Date(cached.date))
    if (diff <= period && cached.items.length > 0) {
      return cached.items
    }
  }
  const sortedResult = await processAllPrices(period)
  const cache = { date: now, items: sortedResult }
  localStorage.setItem(storageKey, JSON.stringify(cache))
  return sortedResult
}

const getBestPricesByPage = async (period, page = 1, perPage = 9) => {
  const prices = await findBestPrices(period)
  const pageIndex = (page - 1) * perPage
  const pageItems = prices.slice(pageIndex, pageIndex + perPage)
  const pageCount = Math.floor(prices.length / perPage)
  return { pageItems, pageCount }
}

export { pricesByIds, getItems, getBestPricesByPage }
