<script setup>
import { http } from '@/components/http'
import { cate,a,ball,word } from './cate'
import Header from './Header.vue'
import { ref } from 'vue'

http()

cate()

ball()

a()

// fetch("http://test.vue")

const refValue = ref(1)

</script>



<template>
  <div>
    <Header :wordaaa="word" :value="refValue"></Header>
  </div>
</template>

<style scoped lang='scss'></style>
