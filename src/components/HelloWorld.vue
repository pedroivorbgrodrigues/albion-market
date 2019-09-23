<template>
  <v-container>
    <v-overlay :value="overlay" v-if="loading">
      <v-progress-circular :size="128" indeterminate></v-progress-circular>
    </v-overlay>
    <v-row>
      <v-col cols="12">
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
    </v-row>
    <v-row>
      <v-col cols="12" v-if="selected.length > 0">
        <v-btn block min-height="68" @click="getPrices" dark>Get travels for selected</v-btn>
      </v-col>
      <v-col cols="12" v-if="selected.length == 0">
        <v-btn block min-height="68" color="primary" @click="getBestPrices" dark>Get best travels</v-btn>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12" md="4" v-for="item in results" :key="item.id">
        <v-card :color="item.color">
          <v-list>
            <v-list-item>
              <v-list-item-avatar size="64" tile>
                <v-img :src="icon(item.id)"></v-img>
              </v-list-item-avatar>
              <v-list-item-content>
                <v-list-item-title class="headline mb-2" v-text="item.name"></v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </v-list>
          <v-list-group value="true">
            <template v-slot:activator>
              <v-list-item-title>Travels</v-list-item-title>
            </template>
            <div v-for="(travel, index) in item.travels" :key="index">
              <v-list-item v-if="travel.rentability > 0" :style="gradient(travel.from, travel.to)">
                <v-list-item-content class="align-self-start">
                  <v-list-item-title class="white--text">
                    {{travel.rentability}}% - {{travel.from}}
                    <v-icon color="white">mdi-arrow-right</v-icon>
                    {{travel.to}}
                    <v-icon color="white">mdi-cash-usd-outline</v-icon>
                    {{travel.profit}}
                  </v-list-item-title>
                </v-list-item-content>
              </v-list-item>
              <v-divider></v-divider>
            </div>
          </v-list-group>
          <v-list-group>
            <template v-slot:activator>
              <v-list-item-title>Prices</v-list-item-title>
            </template>
            <div v-for="city in item.cities" :key="city.name">
              <v-list-item :style="`background-color: ${cityColor(city.name)}`">
                <v-list-item-content class="align-self-start">
                  <v-list-item-title
                    class="white--text"
                  >{{city.name}} - {{city.price}} - {{shortDate(city.date)}}</v-list-item-title>
                </v-list-item-content>
              </v-list-item>
              <v-divider></v-divider>
            </div>
          </v-list-group>
        </v-card>
      </v-col>
    </v-row>
    <v-row v-if="pageCount > 0">
      <v-col cols="12">
        <v-pagination v-model="page" :length="pageCount"></v-pagination>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
import { format } from 'date-fns'

import { pricesByIds, getItems, getBestPricesByPage } from '../services/api'

const baseImageUrl =
  'https://albiononline2d.ams3.cdn.digitaloceanspaces.com/thumbnails/128'

export default {
  created: function () {
    this.items = getItems()
  },
  data () {
    return {
      autoUpdate: true,
      selected: [],
      isUpdating: false,
      items: [],
      results: [],
      cityColors: {
        'Black Market': 'black',
        Caerleon: 'red',
        Bridgewatch: 'orange',
        'Fort Sterling': 'grey',
        Lymhurst: 'green',
        Thetford: 'purple',
        Martlock: 'blue'
      },
      period: 1,
      page: 1,
      perPage: 9,
      pageCount: 0,
      loading: false
    }
  },
  watch: {
    isUpdating (val) {
      if (val) {
        setTimeout(() => (this.isUpdating = false), 3000)
      }
    },
    page (val) {
      this.getBestPrices()
    }
  },
  methods: {
    icon (id) {
      return `${baseImageUrl}/${id}`
    },
    gradient (from, to) {
      const fromColor = this.cityColor(from)
      const toColor = this.cityColor(to)
      return `background: linear-gradient(.25turn, ${fromColor}, ${toColor});`
    },
    remove (item) {
      const index = this.selected.indexOf(item.id)
      if (index >= 0) {
        this.selected.splice(index, 1)
      }
    },
    shortDate (date) {
      return format(new Date(date), 'dd/MM/yy')
    },
    cityColor (city) {
      return this.cityColors[city]
    },
    byCategory (category) {
      this.selected = this.items
        .filter(item => item.inclueds(category))
        .map(item => item.id)
    },
    getPrices () {
      if (this.selected.length <= 0) {
        return
      }
      this.loading = true
      pricesByIds(this.selected, this.period).then(processedItems => {
        this.results = processedItems
        this.pageCount = 0
        this.loading = false
      })
    },
    getBestPrices () {
      this.loading = true
      getBestPricesByPage(this.period, this.page).then(result => {
        this.pageCount = result.pageCount
        this.results = result.pageItems
        this.loading = false
      })
    }
  }
}
</script>
