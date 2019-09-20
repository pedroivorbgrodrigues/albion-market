<template>
  <v-container>
    <v-row>
      <v-col>
        <v-autocomplete
          v-model="selected"
          :disabled="isUpdating"
          :items="items"
          filled
          chips
          color="blue-grey lighten-2"
          label="Select"
          item-text="name"
          item-value="id"
          multiple
        >
          <template v-slot:selection="data">
            <v-chip
              v-bind="data.attrs"
              :input-value="data.selected"
              close
              @click="data.select"
              @click:close="remove(data.item)"
            >
              <v-avatar left>
                <v-img :src="icon(data.item.id)"></v-img>
              </v-avatar>
              {{ data.item.name }}
            </v-chip>
          </template>
          <template v-slot:item="data">
            <template v-if="typeof data.item !== 'object'">
              <v-list-item-content v-text="data.item"></v-list-item-content>
            </template>
            <template v-else>
              <v-list-item-avatar>
                <img :src="icon(data.item.id)" />
              </v-list-item-avatar>
              <v-list-item-content>
                <v-list-item-title v-html="data.item.name"></v-list-item-title>
              </v-list-item-content>
            </template>
          </template>
        </v-autocomplete>
      </v-col>
      <v-col cols="1">
        <v-btn min-height="68" color="warning" @click="getPrices" dark>Get Prices</v-btn>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="4">
        <div class="title">Last update period</div>
        <v-radio-group v-model="period" row>
          <v-radio label="1 day" value="1"></v-radio>
          <v-radio label="3 days" value="3"></v-radio>
          <v-radio label="7 days" value="7"></v-radio>
          <v-radio label="10 days" value="10"></v-radio>
        </v-radio-group>
      </v-col>
    </v-row>
    <v-row>
      <v-col v-for="item in results" :key="item.id">
        <v-card :color="item.color" dark>
          <v-list-item three-line>
            <v-list-item-avatar size="128" tile>
              <v-img :src="icon(item.id)"></v-img>
            </v-list-item-avatar>
            <v-list-item-content class="align-self-start">
              <v-list-item-title class="headline mb-2" v-text="item.name"></v-list-item-title>
              <div>
                <v-chip v-for="(city, key) in filtered(item.cities)" :key="key" class="ma-2" dark :color="cityColor(key)">{{key}} ({{shortDate(city.date)}}) - {{city.price}}</v-chip>
              </div>
            </v-list-item-content>
          </v-list-item>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import items from '../../items.json'
import axios from 'axios'
import { format, differenceInDays } from 'date-fns'

const baseImageUrl =
  'https://albiononline2d.ams3.cdn.digitaloceanspaces.com/thumbnails/128'
const api = 'https://www.albion-online-data.com/api/v1/stats/prices'
const cityColors = { 'Black Market': 'black', 'Caerleon': 'red', 'Bridgewatch': 'orange', 'Fort Sterling': 'grey', 'Lymhurst': 'green', 'Thetford': 'purple', 'Martlock': 'blue' }
export default {
  data () {
    return {
      autoUpdate: true,
      selected: [],
      isUpdating: false,
      items: items,
      results: [],
      period: '1'
    }
  },
  watch: {
    isUpdating (val) {
      if (val) {
        setTimeout(() => (this.isUpdating = false), 3000)
      }
    }
  },
  methods: {
    icon (id) {
      let cleanId = id.split('@')[0]
      return `${baseImageUrl}/${cleanId}`
    },
    remove (item) {
      const index = this.selected.indexOf(item.id)
      if (index >= 0) {
        this.selected.splice(index, 1)
      }
    },
    shortDate (date) {
      return format(date, 'dd/MM/yy')
    },
    cityColor (city) {
      return cityColors[city]
    },
    getPrices () {
      if (this.selected.length <= 0) {
        return
      }
      const selectedItems = this.selected.join(',')
      axios.get(`${api}/${selectedItems}`).then(response => {
        const results = response.data.reduce((prices, current) => {
          if (!prices.hasOwnProperty(current.item_id)) {
            const name = this.items.find(item => item.id === current.item_id).name
            prices[current.item_id] = { id: current.item_id, name, cities: {} }
          }
          prices[current.item_id].cities[current.city] = {
            price: current.sell_price_min,
            date: new Date(current.sell_price_min_date)
          }
          return prices
        }, {})
        this.results = Object.values(results)
      })
    },
    filtered (cities) {
      return Object.entries(cities).reduce((acc, keyPair) => {
        const diff = differenceInDays(new Date(), keyPair[1].date)
        if (diff <= this.period) {
          acc[keyPair[0]] = keyPair[1]
        }
        return acc
      }, {})
    }
  }
}
</script>
