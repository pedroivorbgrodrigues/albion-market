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
      <v-col v-for="item in results" :key="item.id">
        <v-card :color="item.color" dark>
          <v-list-item three-line>
            <v-list-item-avatar size="128" tile>
              <v-img :src="icon(item.id)"></v-img>
            </v-list-item-avatar>
            <v-list-item-content class="align-self-start">
              <v-list-item-title class="headline mb-2" v-text="item.name"></v-list-item-title>
              <v-chip v-for="(city, key) in item.cities" :key="key" class="ma-2" color="primary">{{city.min}}</v-chip>
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
const baseImageUrl =
  'https://albiononline2d.ams3.cdn.digitaloceanspaces.com/thumbnails/128'
const api = 'https://www.albion-online-data.com/api/v1/stats/prices'
export default {
  data () {
    return {
      autoUpdate: true,
      selected: [],
      isUpdating: false,
      items: items,
      results: []
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
      return `${baseImageUrl}/${id}`
    },
    remove (item) {
      const index = this.selected.indexOf(item.id)
      if (index >= 0) {
        this.selected.splice(index, 1)
      }
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
            min: current.sell_price_min,
            max: current.sell_price_max,
            date: current.sell_price_min_date
          }
          return prices
        }, {})
        this.results = Object.values(results)
      })
    }
  }
}
</script>
