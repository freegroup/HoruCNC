var pendantQueue=new Queue;


function PendantSlider(min, max, axis, inverse, vertical, element, thumb) {
    this.min = min
    this.max = max
    this.value = min
    this.element = element
    this.thumb = thumb
    this.inverse = inverse
    this.vertical = vertical
    this.factor = vertical?(inverse?-1:1):(inverse?1:-1)
    this.lastCommand = ""
    this.onMouseUp= ()=>{
        fetch("/machine/reset", {method:"POST"})
        this.reset()
        pendantQueue.clear()
    }
    this.onMouseDown= ()=>{
        fetch(`/machine/pendant/${axis}/200/${1*slider.factor}`, {method:"POST"})
    }
    this.onChange= (value)=>{
        let slider = this
        pendantQueue.clear()
        pendantQueue.add(( doneCallback)=>{
            let distance = 100
            let speed = parseInt(value)/10
            let command = `/machine/pendant/${axis}/${distance*slider.factor}/${speed}`
            if(slider.lastCommand !== command) {
                slider.lastCommand = command
                fetch(command, {method: "POST"})
                    .then(() => {
                        doneCallback()
                        pendantQueue.next()
                    })
            }
            else{
                doneCallback()
                pendantQueue.next()
            }
        })
    }
    let mouseDownCallback =  (evt) => {
        let mouseMoveCallback =  (evt) =>{
            let range = this.vertical ? element.offsetHeight : element.offsetWidth
            let diff = this.vertical ? evt.movementY : evt.movementX
            let newPosition = Math.max(0, Math.min(range, diff + parseInt(this.vertical ? this.thumb.style.top : this.thumb.style.left)))
            let value = max - newPosition / range * (this.max - this.min)
            value = this.inverse ? this.max - value : value
            if(this.vertical){
                this.thumb.style.top = newPosition + 'px'
            }
            else{
                this.thumb.style.left = newPosition + 'px'
            }
            this.value = value
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
        this.onMouseDown()
    }

    this.thumb.addEventListener('mousedown', mouseDownCallback, false);
    this.reset()
}

PendantSlider.prototype.setValue = function (value) {
    value = Math.max(this.min, Math.min(this.max, value))
    let range = this.vertical ? this.element.offsetHeight : this.element.offsetWidth
    let position = Math.floor((this.max - value) / (this.max - this.min) * range)
    position = this.inverse ? range - position : position
    if(this.vertical){
        this.thumb.style.top = position + 'px'
    }
    else{
        this.thumb.style.left = position + 'px'
    }
    this.value = value
    this.onChange(this.value)
}


PendantSlider.prototype.reset = function () {
    let value = this.min
    let range = this.vertical ? this.element.offsetHeight : this.element.offsetWidth
    let position = Math.floor((this.max - value) / (this.max - this.min) * range)
    position = this.inverse ? range - position : position
    if(this.vertical){
        this.thumb.style.top = position + 'px'
    }
    else{
        this.thumb.style.left = position + 'px'
    }
    this.value = value
}
