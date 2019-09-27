<template>
  <v-container>
    <v-overlay :value="loading">
      <v-progress-circular :size="128" indeterminate></v-progress-circular>
    </v-overlay>
    <v-banner single-line elevation="2">
      Quer preços mais atualizados? Rode o programa enquanto acessa as AH's
      <template v-slot:actions>
        <v-btn text @click="clearCache">Limpar cache</v-btn>
        <v-btn
          text
          color="deep-purple accent-4"
          href="https://github.com/BroderickHyman/albiondata-client/releases"
          target="_blank"
        >Baixar</v-btn>
      </template>
    </v-banner>
    <v-row>
      <v-col cols="8" sm="10" md="11" class="pb-0">
        <v-autocomplete
          v-model="selected"
          :disabled="isUpdating"
          :items="items"
          filled
          chips
          color="blue-grey lighten-2"
          label="Selecionar"
          item-text="nome"
          item-value="id"
          multiple
          validate-on-blur
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
              {{ data.item.nome }}
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
                <v-list-item-title v-html="data.item.nome"></v-list-item-title>
              </v-list-item-content>
            </template>
          </template>
        </v-autocomplete>
      </v-col>
      <v-col cols="4" sm="2" md="1" class="pb-0">
        <div class="subtitle-2">Qualidade</div>
        <v-switch color="primary" v-model="useQuality"></v-switch>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="6" md="4" lg="3" class="py-0">
        <v-select
          v-model="categories"
          :items="availableCategories"
          filled
          chips
          label="Categorias"
          multiple
        ></v-select>
      </v-col>
      <v-col cols="6" md="4" lg="3" class="py-0">
        <v-select filled height="68" v-model="selectedTier" :items="tiers" label="Tier"></v-select>
      </v-col>
      <v-col cols="6" md="4" lg="3" class="py-0">
        <v-select
          filled
          height="68"
          v-model="fromCity"
          item
          :items="getFromCities()"
          label="De cidade"
        ></v-select>
      </v-col>
      <v-col cols="6" md="4" lg="3" class="py-0">
        <v-select filled height="68" v-model="toCity" :items="getToCities()" label="Para cidade"></v-select>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12" v-if="selected.length > 0">
        <v-btn block @click="getPrices" dark>Obter viagens para os selecionados</v-btn>
      </v-col>
      <v-col cols="12" v-if="selected.length == 0">
        <v-btn block color="primary" @click="getBestPrices" dark>Obter melhores viagens (~3min)</v-btn>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12" md="4" v-for="item in results" :key="useQuality ? item.idQuality : item.id">
        <v-card :color="item.color">
          <v-list>
            <v-list-item two-line>
              <v-list-item-avatar size="64" tile>
                <v-img :src="icon(item.id)"></v-img>
              </v-list-item-avatar>
              <v-list-item-content>
                <v-list-item-title
                  class="headline mb-2 wrap"
                  :class="qualityClass(item)"
                  v-text="item.nome"
                ></v-list-item-title>
                <v-list-item-subtitle
                  v-if="useQuality"
                  v-text="item.qualityName"
                  class="subtitle-2"
                  :class="qualityClass(item)"
                ></v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
          </v-list>
          <v-list-group value="true">
            <template v-slot:activator>
              <v-list-item-title>Viagens</v-list-item-title>
            </template>
            <div v-for="(travel, index) in item.travels" :key="index">
              <v-list-item v-if="travel.rentability > 0" :style="gradient(travel.from, travel.to)">
                <v-list-item-content class="align-self-start">
                  <v-list-item-title class="white--text">
                    {{travel.rentability}}% - {{travel.from}}
                    <v-icon color="white">mdi-arrow-right</v-icon>
                    {{travel.to}}
                    <v-icon color="white">mdi-cash-usd-outline</v-icon>
                    {{formatPrice(travel.profit)}}
                  </v-list-item-title>
                </v-list-item-content>
              </v-list-item>
              <v-divider></v-divider>
            </div>
          </v-list-group>
          <v-list-group>
            <template v-slot:activator>
              <v-list-item-title>Preços</v-list-item-title>
            </template>
            <div v-for="city in item.cities" :key="city.name">
              <v-list-item :style="`background-color: ${cityColor(city.name)}`">
                <v-list-item-content class="align-self-start">
                  <v-list-item-title class="white--text">
                    <v-row no-gutters>
                      <v-col>
                        <v-icon color="white">mdi-calendar</v-icon>
                        {{shortDate(city.date)}}
                      </v-col>
                      <v-col>{{city.name}}</v-col>
                      <v-col>
                        <v-icon color="white">mdi-cash-usd-outline</v-icon>
                        {{formatPrice(city.price)}}
                      </v-col>
                    </v-row>
                  </v-list-item-title>
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
<style scoped>
.wrap {
  white-space: pre-wrap;
}
.qual0 {
  color: rgb(131, 134, 132) !important;
}
.qual1 {
  color: rgb(106, 143, 181) !important;
}
.qual2 {
  color: rgb(188, 146, 101) !important;
}
.qual3 {
  color: rgb(169, 180, 204) !important;
}
.qual4 {
  color: rgb(255, 170, 44) !important;
}
</style>
<script>
import { format } from 'date-fns'

import { pricesByIds, getItems, filteredByPage } from '../services/api'

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
        QUALQUER: 'transparent',
        'Black Market': 'black',
        Caerleon: 'red',
        Bridgewatch: 'orange',
        'Fort Sterling': 'grey',
        Lymhurst: 'green',
        Thetford: 'purple',
        Martlock: 'blue'
      },
      availableCategories: [
        'ARMADURA',
        'ARMA',
        'CONSUMIVEL',
        'RECURSOS',
        'FAZENDO',
        'MONTARIAS'
      ],
      period: 1,
      page: 1,
      perPage: 9,
      pageCount: 0,
      loading: false,
      tiers: ['QUALQUER', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'],
      selectedTier: 'QUALQUER',
      useQuality: false,
      categories: [],
      fromCity: 'QUALQUER',
      toCity: 'QUALQUER'
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
    qualityClass (item) {
      const quality = item.quality || 0
      return `qual${quality}`
    },
    formatPrice (price) {
      if (price < 999) {
        return price
      }
      const k = price / 1000
      const kSufix = Math.floor(k) > 999 ? 'KK' : 'K'
      return `${Math.floor(k * 10) / 10}${kSufix}`
    },
    getFromCities () {
      if (this.toCity === 'QUALQUER') {
        return Object.keys(this.cityColors).filter(
          key => key !== 'Black Market'
        )
      }
      return Object.keys(this.cityColors).filter(
        key => key !== this.toCity && key !== 'Black Market'
      )
    },
    getToCities () {
      if (this.fromCity === 'QUALQUER') {
        return Object.keys(this.cityColors)
      }
      return Object.keys(this.cityColors).filter(key => key !== this.fromCity)
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
        .filter(item => item.includes(category))
        .map(item => item.id)
    },
    getPrices () {
      if (this.selected.length <= 0) {
        return
      }
      this.loading = true
      pricesByIds(this.selected, {
        period: this.period,
        useQuality: this.useQuality
      }).then(processedItems => {
        this.results = processedItems
        this.pageCount = 0
        this.loading = false
      })
    },
    getBestPrices () {
      this.loading = true
      const filters = {
        categories: this.categories,
        selectedTier: this.selectedTier,
        period: this.period,
        useQuality: this.useQuality,
        fromCity: this.fromCity,
        toCity: this.toCity
      }
      filteredByPage(filters, this.page).then(result => {
        this.pageCount = result.pageCount
        this.results = result.pageItems
        this.loading = false
      })
    },
    clearCache () {
      localStorage.clear()
      this.results = []
      this.pageCount = 0
    }
  }
}
</script>
