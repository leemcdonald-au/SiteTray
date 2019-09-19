// Promisfy various node/javascript APIs.

// APIS to promisfy
const { readFile, writeFile } = require('fs')
const { get } = require('https')

const awRead = (file) => {
    return new Promise((accept, reject) => {
        readFile(file, 'utf8', (err, data) => {
            if(err) reject(err)
            else    accept(data)
        })
    })
}

const awWrite = (dir, data) => {
    return new Promise((accept, reject) => {
        writeFile(dir, data, err => {
            if(err) reject(err)
            else    accept()
        })
    })
}

const awParseJSON = data => {
    return new Promise((accept, reject) => {
        try         { accept(JSON.parse(data)) }
        catch(e)    { reject(e) }
    })
}

const awStringifyJSON = data => {
    return new Promise((accept, reject) => {
        try         { accept(JSON.stringify(data)) }
        catch(e)    { reject(e) }
    })
}

const awGet = url => {
    return new Promise((accept, reject) => {
        const finish = []
        get(url, res => {
            res.on('data', data => finish.push(data))
            res.on('end', () => accept(Buffer.concat(finish)))
        }).on('error', reject)
    })
}

module.exports = { awRead, awWrite, awParseJSON, awGet, awStringifyJSON }