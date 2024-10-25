<template>
  <el-card shadow="hover" style="margin-top: 5px">
    <el-table
      ref="multipleTable"
      :data="currentTableData"
      stripe="true"
      tooltip-effect="dark"
      style="width: 100%"
      @selection-change="handleSelectionChange"
      @select-all="handleSelectAll"
    >
      <el-table-column type="selection" width="40"> </el-table-column>
      <el-table-column prop="datebookId" label="Class ID" width="100"> </el-table-column>
      <el-table-column prop="dateTime" label="Time" width="120"> </el-table-column>
      <el-table-column prop="lessonPlan" label="Lesson" width="360"> </el-table-column>
      <el-table-column prop="userName" label="Student" width="120"> </el-table-column>
    </el-table>
  </el-card>
  <div class="bottom">
    <div class="pagination">
      <el-pagination
        v-model:currentPage="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        size="default"
        background="true"
        @current-change="handleCurrentChange"
        layout="total, prev, pager, next"
      />
    </div>
    <div class="submit">
      <el-button type="primary" @click="submit" :disabled="selected.length === 0">提交评语</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from "vue";
import { ElMessage } from "element-plus";
import { getClass, submitComments } from "../../util.js";
const multipleTable = ref("");
const currentTableData = ref([]);
const allTableData = ref([]);
const currentPage = ref(1);
const pageSize = ref(5);
const total = ref(0);
const selected = ref([]);

const handleSelectAll = (val) => {
  if (val.length > 0) {
    selected.value = allTableData.value.map((el) => {
      return el.datebookId;
    });
  } else {
    selected.value = [];
  }
};

const handleSelectionChange = (val) => {
  var selectedIds = val.map((el) => {
    return el.datebookId;
  });

  var currentPageIds = currentTableData.value.map((el) => {
    return el.datebookId;
  });

  selected.value = [
    ...selected.value.filter((item) => !currentPageIds.includes(item)),
    ...selectedIds,
  ];
};

const submit = async () => {
  if (!selected.value || selected.value.length === 0) {
    ElMessage({ message: "请选择要提交的课程", type: "warning" });
    return;
  }

  var result = await submitComments(selected.value);
  if (result && result.resultCode === 0) {
    ElMessage({ message: "提交评语成功", type: "success" });
  } else {
    ElMessage({ message: `提交评语失败：${result?.resultMessage}`, type: "error" });
  }
  await init();
};

// 查询操作
const handleQuery = () => {
  total.value = allTableData.value.length;
  currentTableData.value = allTableData.value.filter((item, index) => {
    return (
      index >= (currentPage.value - 1) * pageSize.value &&
      index < currentPage.value * pageSize.value
    );
  });
  // 修改页面选中状态
  currentTableData.value.forEach((el) => {
    if (!selected.value.includes(el.datebookId)) return;
    nextTick(() => {
      multipleTable.value.toggleRowSelection(el);
    });
  });
};

// 改变页码序号
const handleCurrentChange = (val) => {
  currentPage.value = val;
  handleQuery();
};

const init = async () => {
  selected.value = [];
  var data = await getClass();
  if (data && data.resultCode === 0 && data.resultData) {
    allTableData.value = data.resultData.bookedList;
    // 默认全选
    selected.value = allTableData.value.map((el) => {
      return el.datebookId;
    });
    handleQuery();
  } else {
    ElMessage.error("获取数据失败: " + data?.resultMessage);
  }
};

onMounted(async () => {
  await init();
});
</script>
<style scoped>
.bottom {
  position: fixed;
  width: 100%;
  left: 20px;
  bottom: 20px;
}
.bottom .pagination {
  float: left;
}
.bottom .submit {
  float: right;
  margin-right: 30px;
}
</style>
