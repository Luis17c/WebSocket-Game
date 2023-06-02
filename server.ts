import express from 'express'
import { Server} from 'socket.io'
import { createServer } from 'http'
import CORS from 'cors'

const app = express()
const server = createServer(app)
const wss = new Server(server)

app.use(CORS())
app.use(express.json())

app.use('/public', express.static('public', {}))

interface IPlayer {id: string, p: number, x: number, y: number}
interface IFruit {x: number, y: number}

let game: {
    players: Array<IPlayer>
    fruits: Array<IFruit>
} = {
    players: [],
    fruits: []
}

function addFruit () {
    let fruit = {
        x: Math.floor(Math.random() * 800),
        y: Math.floor(Math.random() * 800)
    }
    game.fruits.push(fruit)
}

let i = 0
while (i < 10) {
    addFruit()
    i++
}

wss.on('connection', (socket) => {
    let player = {
        id: socket.id,
        p: 1,
        x: Math.floor(Math.random() * 800),
        y: Math.floor(Math.random() * 800)
    }
    game.players.push(player)
    wss.emit('setup', game)

    socket.on('move', (move: {xy: 'x' | 'y', value: number}) => {
        game.players.forEach(player1 => {
            if (player1.id == socket.id) {
                let newValue = player1[move.xy] - move.value
                if (newValue  > 1 && newValue < 800 ) {
                    player1[move.xy] = newValue
                }
            }
        })
        wss.emit('setup', game)
    })

    socket.on('fruit-collision', (targets: {player: IPlayer, fruit: IFruit}) => {
        game.players.forEach(player1 => {
            if (player1.id == targets.player.id) {
                player1.p += 0.1
            }
        })
        game.fruits.forEach(fruit1 => {
            if (fruit1.x === targets.fruit.x && targets.fruit.y === fruit1.y) {
                let index = game.fruits.indexOf(fruit1)
                game.fruits.splice(index, 1)
            }
        })
        addFruit()
        wss.emit('setup', game)
    })

    socket.on('players-collision', ({ player1, player2 }) => {
        if (player1.p - player2.p >= 0.5) {
            game.players.forEach(target => {
                if (target.id == player2.id) {
                    let index = game.players.indexOf(target)
                    game.players.splice(index, 1)
                }
            })
            game.players.forEach(target => {
                if (target.id == player1.id) {
                    target.p += player2.p * 0.5
                }
            })
        }

        if (player2.p - player1.p >= 0.5) {
            game.players.forEach(target => {
                if (target.id == player1.id) {
                    let index = game.players.indexOf(target)
                    game.players.splice(index, 1)
                }
            })
            game.players.forEach(target => {
                if (target.id == player2.id) {
                    target.p += player1.p * 0.5
                }
            })
        }
        wss.emit('setup', game)
    })

    socket.on('disconnect', () => {
        game.players.forEach(player1 => {
            if (player1.id == socket.id) {
                let index = game.players.indexOf(player1)
                game.players.splice(index, 1)
            }
        })
        wss.emit('setup', game)
    })
})

server.listen(8080, () => {
    console.log('> Server started on port 8080')
})
