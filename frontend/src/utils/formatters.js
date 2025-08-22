export const capitalizeFirstLetter = (val) => {
  if (!val) return ''
  return `${val.charAt(0).toUpperCase()}${val.slice(1)}`
}
export const interceptorLoadingElements = (calling) => {
// DOM Lây ra toàn bộ phần tử trên page hiện tại có className là 'interceptor-loading
  const elements = document.querySelectorAll('.interceptor-loading')
  for (let i = 0; i < elements.length; i++) {
    if (calling) {
    // Nếu đang trong thời gian co gọi API (calling == true) thì sẽ làm mở phần tử và chặn click bằng css-pointer-events
      elements[i].style.setProperty('opacity', '0.5', 'important')
      elements[i].style.setProperty('pointer-events', 'none', 'important')
      elements[i].classList.add('interceptor-loading-active')
    } else {
      // Ngược lại thì trả về như ban đầu, không làm gì cả
      elements[i].style.setProperty('opacity', 'initial', 'important')
      elements[i].style.setProperty('pointer-events', 'initial', 'important')
      elements[i].classList.remove('interceptor-loading-active')
    }
  }
}