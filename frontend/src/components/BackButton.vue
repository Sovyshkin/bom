<script setup>
</script>
<template>
    <button class="back" @click="$router.go(-1)">
        <img src="@/assets/arrow-left.svg" alt="">
        Назад
    </button>
</template>
<style scoped>
.back {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #8C93A6;
    font-size: 14px;
    font-weight: 500;
}
</style>