<template>
  <div>'hhh'</div>
</template>
<script>
import { obj } from './urls';

import { getHeader } from '../api/headerjs.js'
import { tsFunc } from '../api/testTs';
export default {
  name: 'hhh',
  data: () => { },
  method: {

    req() {

      getHeader()

      tsFunc()

      this.$rest.get({url: 'http://script-$rest-url'})

      request({
        url: '/api/abc'
      })

      request({
        url: obj.a.b
      })


      const url = 'const url'

      const ab = {
        url
      }
      
      // fetch('http://header.vue')

      // getHeader()
    }
  }
}
</script>


<style scoped lang='scss'></style>