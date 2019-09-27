import axios from 'axios'
import localItems from './items.json'

const api = 'https://www.albion-online-data.com/api'

const { differenceInCalendarDays } = require('date-fns')
const allowedCities = ['Black Market', 'Caerleon', 'Bridgewatch', 'Fort Sterling', 'Lymhurst', 'Thetford', 'Martlock']

const getItems = () => {
  return localItems
}

const groupCitiesByItemId = (filters, prices, current) => {
  const { period, useQuality } = filters
  const idQuality = useQuality ? `${current.item_id}-${current.quality}` : current.item_id
  if (!prices[idQuality]) {
    prices[idQuality] = { id: current.item_id, cities: [] }
    if (useQuality) {
      prices[idQuality].idQuality = idQuality
      prices[idQuality].quality = current.quality
    }
  }
  const diff = differenceInCalendarDays(new Date(), new Date(current.sell_price_min_date))
  if (allowedCities.includes(current.city) && diff <= period) {
    const isBlackMarket = current.city === 'Black Market'
    prices[idQuality].cities.push({
      name: current.city,
      price: isBlackMarket ? current.buy_price_min : current.sell_price_min,
      date: isBlackMarket ? current.buy_price_min_date : current.sell_price_min_date
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

const calculateTravels = (cities, fromCity, toCity) => {
  let targetCities = cities
  if (fromCity !== 'QUALQUER') {
    const fromIndex = cities.findIndex(city => city.name === fromCity)
    if (fromIndex < 0 || fromIndex + 1 >= cities.length) {
      return []
    }
    targetCities = cities.slice(fromIndex)
  }
  const result = targetCities.reduce((travels, city, index, sorted) => {
    if (index > 0) {
      let rentability = (city.price / sorted[0].price - 1) * 100
      let profit = city.price - sorted[0].price
      if (isOutlier(sorted[0].price, rentability)) {
        rentability = 0
        profit = 0
      }
      const travel = {
        from: sorted[0].name,
        to: city.name,
        rentability: Math.floor(rentability),
        profit: profit
      }
      if (toCity === 'QUALQUER' || city.name === toCity) {
        travels.push(travel)
      }
    }
    return travels
  }, [])
  return result
}
const qualityEnum = ['Normal', 'Bom', 'Excepcional', 'Excelente', 'Obra Prima']
const processResult = (results, useQuality, fromCity, toCity) => {
  const items = getItems()
  const processedItems = results.filter(item => item.cities.length >= 2)
    .map(item => {
      const travels = calculateTravels(item.cities, fromCity, toCity)
      const sortedTravels = travels.sort((a, b) => b.rentability - a.rentability)
      const nome = items.find(i => i.id === item.id).nome
      const processedItem = { ...item, travels: sortedTravels, nome }
      if (useQuality) {
        processedItem.qualityName = qualityEnum[item.quality]
      }
      return processedItem
    })
  return processedItems
}

const sortByTravels = (items) => {
  return items.sort((a, b) => b.travels[0].rentability - a.travels[0].rentability)
}

const pricesByIds = async (ids, filters) => {
  try {
    const version = filters.useQuality ? 'v2' : 'v1'
    const response = await axios.get(`${api}/${version}/stats/prices/${ids.join(',')}`)
    const groupedItems = response.data.reduce(groupCitiesByItemId.bind(this, filters), {})
    const cleanItems = Object.values(groupedItems).map(item => {
      const sorted = item.cities.sort((a, b) => a.price - b.price)
      if (sorted.length > 0 && sorted[0].name === 'Black Market') {
        sorted.splice(0, 1)
      }
      return { ...item, cities: sorted }
    })
    const processedItems = processResult(cleanItems, filters.useQuality, filters.fromCity, filters.toCity)
    return filters.sorted ? sortByTravels(processedItems) : processedItems
  } catch (error) {
    console.log(error.toString())
    return []
  }
}

const processAllPrices = async (filters) => {
  let index = 0
  const batchSize = 100
  const batches = []
  const items = getItems()
  while (index <= items.length) {
    const batch = items.slice(index, index + batchSize)
    batches.push(batch.map(item => item.id))
    index += batchSize
  }
  const promises = batches.map(batchIds => pricesByIds(batchIds, { ...filters, sorted: false }))
  const results = await Promise.all(promises)
  const mergedResults = Array.prototype.concat.apply([], results)
  const cleanResults = mergedResults.filter(entry => entry.travels.length > 0)
  const sortedResult = sortByTravels(cleanResults)
  return sortedResult
}

const cacheKey = 'cache'
const findBestPrices = async (filters) => {
  const { period } = filters
  const cachedJSON = localStorage.getItem(cacheKey)
  const now = new Date()
  if (cachedJSON != null) {
    const cached = JSON.parse(cachedJSON)
    const diff = differenceInCalendarDays(now, new Date(cached.date))
    if (diff <= period && cached.items.length > 0 && JSON.stringify(filters) === JSON.stringify(cached.filters)) {
      return cached.items
    }
  }
  const sortedResult = await processAllPrices(filters)
  const cache = { date: now, items: sortedResult, filters }
  localStorage.setItem(cacheKey, JSON.stringify(cache))
  return sortedResult
}

const getCategoriesKeywords = categories => {
  let keywords = []
  if (categories.includes('ARMADURA')) {
    keywords.push('_ARMOR_', '_SHOES_', '_HEAD_', '_CAPE', '_BAG')
  }
  if (categories.includes('ARMA')) {
    keywords.push('_2H_', '_MAIN_', '_OFF_')
  }
  if (categories.includes('CONSUMIVEL')) {
    keywords.push('_MEAL', '_POTION')
  }
  if (categories.includes('RECURSOS')) {
    keywords.push('_ROCK_', '_WOOD_', '_FIBER_', '_ORE_', '_HIDE_', '_STONEBLOCK_', '_PLANKS_', '_METALBAR_', '_LEATHER_', '_CLOTH_')
  }
  if (categories.includes('FAZENDO')) {
    keywords.push('_FARM_')
  }
  if (categories.includes('MONTARIAS')) {
    keywords.push('_MOUNT_')
  }
  return keywords
}

const applyFilters = async (filters) => {
  const { period, categories, selectedTier, useQuality, fromCity, toCity } = filters
  const prices = await findBestPrices({ period, useQuality, fromCity, toCity })
  if (categories.length <= 0 && selectedTier === 'QUALQUER') {
    return prices
  }
  let filtered = prices
  if (selectedTier !== 'QUALQUER') {
    filtered = filtered.filter(item => item.id.startsWith(selectedTier))
  }
  if (categories.length > 0) {
    const keywords = getCategoriesKeywords(categories)
    filtered = filtered.filter(item => keywords.some(kw => item.id.includes(kw)))
  }
  return filtered
}

const filteredByPage = async (filters, page = 1, perPage = 9) => {
  const prices = await applyFilters(filters)
  const pageIndex = (page - 1) * perPage
  const pageItems = prices.slice(pageIndex, pageIndex + perPage)
  const pageCount = Math.floor(prices.length / perPage)
  return { pageItems, pageCount }
}

export { pricesByIds, getItems, applyFilters, filteredByPage }
