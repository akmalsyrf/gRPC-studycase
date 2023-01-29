const express = require("express")
const client = require("./client")

const app = express()
const port = 3000

app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.get("/news", (req,res)=> {
    client.GetAllNews({}, (error, news) => {
        // console.log(error)
        if (error) res.status(400).send({
            status : 'failed',
            message : 'Bad Request',
            error
        })
        res.send({
            status:`success get all news`, 
            data: news
        })
    });
})
app.get("/news/:id", (req,res)=> {
    const { id } = req.params
    client.GetNews({id}, (error, news) => {
        // console.log(error)
        if (error) res.status(400).send({
            status : 'failed',
            message : 'Bad Request',
            error
        })
        res.send({
            status:`success get news by id ${id}`, 
            data: news
        })
    });
})
app.post("/news", (req,res)=> {
    const {body,title, postImage} = req.body
    if(body && title && postImage){
        client.AddNews({body, title, postImage, id: Date.now()}, (error, news)=>{
            if (error) res.status(400).send({
                status : 'failed',
                message : 'Bad Request',
                error
            })
            res.send({
                status:`success added news`, 
                data: news
            })
        })
    } else {
        res.status(400).json({
            status:"failed",
            message : "You must provide body, title, and postImage"
        })
    }
})
app.put("/news/:id", (req,res)=> {
    const {id} = req.params
    const {body,title, postImage} = req.body
    client.EditNews({id,body, title, postImage}, (error, news)=>{
        if (error) res.status(400).send({
            status : 'failed',
            message : 'Bad Request',
            error
        })
        res.send({
            status:`success edit news id ${id}`, 
            data: news
        })
    })
})
app.delete("/news/:id", (req,res)=> {
    const {id} = req.params
    client.DeleteNews({id}, (error, news)=>{
        if (error) res.status(400).send({
            status : 'failed',
            message : 'Bad Request',
            error
        })
        res.send({
            status:`success delete news id ${id}`,
            data : news
        })
    })
})

app.listen(port,()=> console.log(`Server is listening on port ${port}`))