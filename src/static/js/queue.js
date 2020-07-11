function Queue(){
    Object.defineProperties(
        this,
        {
            add:{
                enumerable:true,
                writable:false,
                value:addToQueue
            },
            next:{
                enumerable:true,
                writable:false,
                value:run
            },
            clear:{
                enumerable:true,
                writable:false,
                value:clearQueue
            }
        }
    );

    let queue=[];
    let running=false;

    function clearQueue(){
        queue=[];
        return queue;
    }

    function addToQueue(){
        for(let i in arguments){
            queue.push(arguments[i]);
        }
        if(!running){
            this.next();
        }
    }

    function run(){
        running=true;
        if(queue.length<1){
            running=false;
            return;
        }

        queue.shift().bind(this)( ()=>{
            running = false
        });
    }
}