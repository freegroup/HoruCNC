function DragSlider(min, max, element, thumb) {
    this.min = min
    this.max = max
    this.value = min
    this.element = element
    this.thumb = thumb

    let mouseDownCallback =  (evt) => {
        let mouseMoveCallback =  (evt) =>{
            let yRange = element.offsetHeight
            let diffY =  evt.movementY
            let y = Math.max(0, Math.min(yRange, diffY + parseInt(this.thumb.style.top)))
            this.thumb.style.top = y +'px'
            this.value = max - y / yRange * (max - min)
            this.onChange(this.value)
            evt.preventDefault()
        }

        let mouseUpCallback = () =>{
            document.removeEventListener('mousemove', mouseMoveCallback, false)
            document.removeEventListener('mouseup', mouseUpCallback, false)
            this.onMouseUp()
        }

        document.addEventListener('mousemove', mouseMoveCallback, false)
        document.addEventListener('mouseup', mouseUpCallback, false)
        evt.preventDefault()
    }

    this.thumb.addEventListener('mousedown', mouseDownCallback, false);
}

DragSlider.prototype.setValue = function (value) {
    value = Math.max(this.min, Math.min(this.max, value))
    let yRange = this.element.clientHeight
    let y = Math.floor((this.max - value) / (this.max - this.min) * yRange)
    this.thumb.style.top = y + 'px'
    this.value = value
    this.onChange(this.value)
}


DragSlider.prototype.reset = function () {
    let value = Math.max(this.min, Math.min(this.max, 0))
    let yRange = this.element.clientHeight
    let y = Math.floor((this.max - value) / (this.max - this.min) * yRange)
    this.thumb.style.top = y + 'px'
    this.value = value
}
