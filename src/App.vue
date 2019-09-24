<template>
  <v-app>
    <v-app-bar app>
      <v-btn text class="no-background" to="/">
        <v-toolbar-title class="headline text-uppercase">
          <span>ALBION</span>
          <span class="font-weight-light">AUCTION HOUSE</span>
        </v-toolbar-title>
      </v-btn>
      <v-spacer></v-spacer>
      <v-toolbar-items>
        <v-btn text to="about">FAQ</v-btn>
      </v-toolbar-items>
    </v-app-bar>
    <v-content>
      <router-view></router-view>
    </v-content>
  </v-app>
</template>
<style scoped>
.no-background::before {
  background-color: inherit;
}
</style>
<script>
export default {
  name: 'App',
  data: () => ({
    //
  })
}
</script>
