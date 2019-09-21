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
      <v-col cols="4">
        <div class="title">Last update period</div>
        <v-radio-group v-model="period" row>
          <v-radio label="1 day" value="1"></v-radio>
          <v-radio label="3 days" value="3"></v-radio>
          <v-radio label="7 days" value="7"></v-radio>
          <v-radio label="10 days" value="10"></v-radio>
        </v-radio-group>
      </v-col>
      <v-col cols="1" xs="12" md="2">
        <v-btn min-height="68" color="warning" @click="getPrices" dark>Get Prices</v-btn>
      </v-col>
    </v-row>
    <v-row>
      <v-col xs="12">
        <div class="title">Legend</div>
        <v-chip
          v-for="(value, key) in cityColors"
          label
          :key="key"
          class="ma-2"
          dark
          :color="value"
        >{{key}}</v-chip>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="4" v-for="item in itemsByPeriod" :key="item.id">
        <v-card min-height="466" :color="item.color">
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
          <v-list>
            <v-subheader>Travels</v-subheader>
            <div v-for="(travel, index) in item.travels" :key="index">
              <v-list-item :style="gradient(travel.from, travel.to)">
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
          </v-list>
          <v-list>
            <v-subheader>Prices</v-subheader>
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
          </v-list>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
import items from '../../items.json'
import axios from 'axios'
import { format } from 'date-fns'

const baseImageUrl =
  'https://albiononline2d.ams3.cdn.digitaloceanspaces.com/thumbnails/128'
const api = 'http://localhost:5000/albion-ah/us-central1'
export default {
  data () {
    return {
      autoUpdate: true,
      selected: [],
      isUpdating: false,
      items: items,
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
  computed: {
    itemsByPeriod: function () {
      return this.results.map(item => {
        return { ...item, cities: item.cities }
      }).filter(item => item.cities.length > 2)
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
      axios
        .post(`${api}/pricesByIds`, { ids: this.selected, period: this.period })
        .then(response => {
          this.results = response.data.items.map(item => {
            const name = this.items.find(i => i.id === item.id).name
            return { ...item, name }
          })
        })
    }
  }
}
</script>
