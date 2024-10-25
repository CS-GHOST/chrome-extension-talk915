<template>
  <el-card shadow="hover" style="margin-top: 5px">
    <el-form ref="formRef" :model="formData" label-position="top" label-width="80px" >
      <el-form-item label="Pronunciation" prop="pronunciation" :rules="[{required: true}]">
        <li @click="showPanel(0)">
          <el-input v-model="formData.pronunciation" placeholder="请选择或输入" style="width: 100%; z-index: 999;" clearable></el-input>
          <el-cascader class="hiden" v-model="formData.pronunciation" :options="options.pronunciation" :props="{ value:'label', emitPath:false }" :show-all-levels="false" style="width: 100%; opacity: 0; left: 0px; position: absolute;" filterable></el-cascader>
        </li>
      </el-form-item>
      <el-form-item label="Vocabulary" prop="vocabulary" :rules="[{required: true}]">
        <li @click="showPanel(1)">
          <el-input v-model="formData.vocabulary" placeholder="请选择或输入" style="width: 100%; z-index: 999;" clearable></el-input>
          <el-cascader class="hiden" v-model="formData.vocabulary" :options="options.vocabulary" :props="{ value:'label', emitPath:false }" :show-all-levels="false" style="width: 100%; opacity: 0; left: 0px; position: absolute;" filterable></el-cascader>
        </li>
      </el-form-item>
      <el-form-item label="Grammar" prop="grammar" :rules="[{required: true}]">
        <li @click="showPanel(2)">
          <el-input v-model="formData.grammar" placeholder="请选择或输入" style="width: 100%; z-index: 999;" clearable></el-input>
          <el-cascader class="hiden" v-model="formData.grammar" :options="options.grammar" :props="{ value:'label', emitPath:false }" :show-all-levels="false" style="width: 100%; opacity: 0; left: 0px; position: absolute;" filterable></el-cascader>
        </li>
      </el-form-item>
      <el-form-item label="Suggestion" prop="suggestion" :rules="[{required: true}]">
        <li @click="showPanel(3)">
          <el-input v-model="formData.suggestion" placeholder="请选择或输入" style="width: 100%; z-index: 999;" clearable></el-input>
          <el-cascader class="hiden" v-model="formData.suggestion" :options="options.suggestion" :props="{ value:'label', emitPath:false }" :show-all-levels="false" style="width: 100%; opacity: 0; left: 0px; position: absolute;" filterable></el-cascader>
        </li>
      </el-form-item>
      <el-form-item>
        <el-text>页面是否显示</el-text>
        <el-switch v-model="formData.contentShow" class="mt-2" style="margin-left: 24px" inline-prompt :active-icon="Check" :inactive-icon="Close"/>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="saveTemplate(formRef)">保存模板</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>
<script setup>
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { Check, Close } from '@element-plus/icons-vue'
import { getCommentOptions, getCommentTemplate, saveCommentTemplate, refreshContent } from "../../util.js";

const formRef = ref();
const formData = ref({
  contentShow: false,
  pronunciation: '',
  vocabulary: '',
  grammar: '',
  suggestion: '',
});
const options = ref({
  pronunciation: [],
  vocabulary: [],
  grammar: [],
  suggestion: [],
});

const showPanel = (index) => {
  document.getElementsByClassName("hiden")[index].click();
}

const saveTemplate = (formEl) => {
  if (!formEl) return;
  formEl.validate((valid) => {
    if (valid) {
      var result = saveCommentTemplate(formData.value);
      if (result) {
        ElMessage({ message: "保存模板成功", type: "success" });
      } else {
        ElMessage({ message: "保存模板失败", type: "error" });
      }
      // 刷新页面
      refreshContent();
    } else {
      return false;
    }
  });
};

onMounted(async () => {
  options.value = await getCommentOptions();
  var template = await getCommentTemplate();
  if (template) {
    formData.value = template;
  }
});
</script>
<style scoped>
li {
  width: 100%;
  list-style: none;
}
</style>
