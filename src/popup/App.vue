<template>
  <div id="app" class="page">
    <el-menu
      :default-active="activeIndex"
      class="el-menu"
      mode="horizontal"
      @select="handleSelect"
    >
      <el-menu-item index="eComment">提交评语</el-menu-item>
      <el-menu-item index="eTemplate">编辑模板</el-menu-item>
    </el-menu>
    <component :is="currentComponent"></component>
  </div>
</template>

<script>
import eComment from "./view/comment/index.vue";
import eTemplate from "./view/template/index.vue";
export default {
  components: { eComment, eTemplate },
  data() {
    return {
      activeIndex: "eComment",
      currentComponent: "eComment",
    };
  },
  methods: {
    handleSelect(index) {
      this.currentComponent = index;
    },
  },
};
</script>

<style scoped>
.page {
  margin-top: 5px;
  width: 780px;
  height: 550px;
}
</style>
