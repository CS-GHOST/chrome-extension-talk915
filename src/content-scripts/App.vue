<template>
  <div class="all">
    <span style="color: #0087ff">共<span>{{total}}</span>节课可打评语</span>
    <button class="primary" @click="submit">提交所有评语</button>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";

export default {
  props: {
    total: Number,
  },
};

const submit = () => {
  console.log("submitAll");
};

onMounted(async () => {
  console.log("init App.vue");
});
</script>
<style scoped>
.all {
  float: left;
  color: white;
}
.all button {
  background-color: #0087ff;
  border: none;
  text-align: center;
  font-size: 16px;
  color: white;
  padding: 5px 10px;
  display: inline-block;
  text-decoration: none;
  border-radius: 5px;
  margin-left: 10px;
}
</style>