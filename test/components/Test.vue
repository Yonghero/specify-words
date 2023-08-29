<script setup>
import { http } from '@/components/http'
import { cate,a,ball } from './cate'
import Header from './Header.vue'

http()

cate()

ball()

a()

// fetch("http://test.vue")

</script>



<template>
  <div>
    <Header></Header>
  </div>
</template>

<style scoped lang='scss'></style>