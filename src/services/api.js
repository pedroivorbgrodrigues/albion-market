import axios from 'axios'
import localItems from './items.json'

const api = 'https://www.albion-online-data.com/api/v1/stats/prices'

const { differenceInCalendarDays } = require('date-fns')
const allowedCities = ['Caerleon', 'Bridgewatch', 'Fort Sterling', 'Lymhurst', 'Thetford', 'Martlock']

const getItems = () => {
  return localItems
}

const groupCitiesByItemId = (period, prices, current) => {
  if (!prices[current.item_id]) {
    prices[current.item_id] = { id: current.item_id, cities: [] }
  }
  const diff = differenceInCalendarDays(new Date(), new Date(current.sell_price_min_date))
  if (allowedCities.includes(current.city) && diff <= period) {
    prices[current.item_id].cities.push({
      name: current.city,
      price: current.sell_price_min,
      date: current.sell_price_min_date
    })
  }
  return prices
}

const isOutlier = (minPrice, rentability) => {
  if (minPrice <= 1000) {
    return rentability > 3000
  }
  if (minPrice <= 10000) {
    return rentability > 2000
  }
  if (minPrice <= 50000) {
    return rentability > 1000
  }
  return rentability > 400
}

const calculateTravels = (travels, city, index, sorted) => {
  if (index > 0) {
    let rentability = (city.price / sorted[0].price - 1) * 100
    if (isOutlier(sorted[0].price, rentability)) {
      rentability = 0
    }
    travels.push({
      from: sorted[0].name,
      to: city.name,
      rentability: Math.floor(rentability),
      profit: city.price - sorted[0].price
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
    const diff = differenceInCalendarDays(now, new Date(cached.date))
    if (diff <= period && cached.items.length > 0) {
      return cached.items
    }
  }
  const sortedResult = await processAllPrices(period)
  const cache = { date: now, items: sortedResult }
  localStorage.setItem(storageKey, JSON.stringify(cache))
  return sortedResult
}

const getCategoriesKeywords = categories => {
  let keywords = []
  if (categories.includes('ARMOR')) {
    keywords.push('_ARMOR_', '_SHOES_', '_HEAD_', '_CAPE', '_BAG')
  }
  if (categories.includes('WEAPON')) {
    keywords.push('_2H_', '_MAIN_', '_OFF_')
  }
  if (categories.includes('CONSUMABLE')) {
    keywords.push('_MEAL', '_POTION')
  }
  if (categories.includes('RESOURCES')) {
    keywords.push('_ROCK_', '_WOOD_', '_FIBER_', '_ORE_', '_HIDE_', '_STONEBLOCK_', '_PLANKS_', '_METALBAR_', '_LEATHER_', '_CLOTH_')
  }
  if (categories.includes('FARM')) {
    keywords.push('_FARM_')
  }
  if (categories.includes('MOUNTS')) {
    keywords.push('_MOUNT_')
  }
  return keywords
}

const filteredKey = 'filtered'
const applyFilters = async (period, categories, selectedTier) => {
  const prices = await findBestPrices(period)
  if (categories.length <= 0 && selectedTier === 'ANY') {
    const cache = { date: new Date(), items: prices }
    localStorage.setItem(filteredKey, JSON.stringify(cache))
    return prices
  }
  let filtered = prices
  if (selectedTier !== 'ANY') {
    filtered = filtered.filter(item => item.id.startsWith(selectedTier))
  }
  if (categories.length > 0) {
    const keywords = getCategoriesKeywords(categories)
    filtered = filtered.filter(item => keywords.some(kw => item.id.includes(kw)))
  }

  const cache = { date: new Date(), items: filtered }
  localStorage.setItem(filteredKey, JSON.stringify(cache))
  return filtered
}

const getFiltered = async (period, categories, selectedTier) => {
  const cachedJSON = localStorage.getItem(filteredKey)
  if (cachedJSON != null) {
    const cached = JSON.parse(cachedJSON)
    if (cached.items.length > 0) {
      return cached.items
    }
  }
  const filtered = await applyFilters(period, categories, selectedTier)
  return filtered
}

const filteredByPage = async (categories, selectedTier, period, page = 1, perPage = 9) => {
  const prices = await getFiltered(period, categories, selectedTier)
  const pageIndex = (page - 1) * perPage
  const pageItems = prices.slice(pageIndex, pageIndex + perPage)
  const pageCount = Math.floor(prices.length / perPage)
  return { pageItems, pageCount }
}

export { pricesByIds, getItems, applyFilters, filteredByPage }
