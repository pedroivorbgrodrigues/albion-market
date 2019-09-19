<template>
  <v-container>
    <v-layout text-center wrap>
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
                    <img :src="icon(data.item.id)">
                  </v-list-item-avatar>
                  <v-list-item-content>
                    <v-list-item-title v-html="data.item.name"></v-list-item-title>
                  </v-list-item-content>
                </template>
              </template>
            </v-autocomplete>
          </v-col>
      </v-row>
    </v-layout>
  </v-container>
</template>

<script>
import items from '../../items.json'
const baseImageUrl = 'https://albiononline2d.ams3.cdn.digitaloceanspaces.com/thumbnails/128'
export default {
  data () {
    return {
      autoUpdate: true,
      selected: [],
      isUpdating: false,
      name: 'Midnight Crew',
      items: items,
      title: 'The summer breeze'
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
    }
  }
}
</script>
