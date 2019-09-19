// Requirements.
const { app, BrowserWindow, ipcMain, Menu, nativeImage, Tray } = require('electron')
const { awGet, awRead, awWrite, awParseJSON } = require('./AwaitFuncs.js')
const TraySite = require('./TraySite.js')

const APP = {
    sites: [],

    addSite: async (url, sicon = null) => {
        const icon  = sicon || await awGet(`https://www.google.com/s2/favicons?domain_url=${url}`).catch(APP.err)
        const image = sicon || nativeImage.createFromBuffer(icon)    // Google will set a default world icon if none is present.
        const site = new TraySite(url, image)
        site.on('init', () => APP.sites[0].window.webContents.send('init', site.id))
        APP.sites.push(site)
        return site
    },

    err: e => {
        console.error(e)
        return null
    }
}

// Electron has been initialized.
app.on('ready', async () => {
    // Add the application.
    APP.addSite(`${__dirname}/UI/app.html`, nativeImage.createFromPath(`${__dirname}/UI/images/tray.png`))

    APP.addSite('https://music.youtube.com')
})

/*
// Quick and dirty error handler.
function onError(error) {
    console.error(error)
    return null
}

// Store the TraySite objects.
const sites = []

class TraySite {
    constructor(url, icon, load = false) {
        // Bind object data.
        this.icon           = icon
        this.window         = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: true } }) // Only enabled for the first window.
        this.tray           = new Tray(this.icon)
        this.url            = url
        this.initialized    = false
        this.id             = sites.length

        if(load) {
            this.window.loadURL(this.url) 
            this.initialized = true
        }

        // Bind show/hide events.
        this.tray.on('click',   () => {
            if(!this.initialized) {
                this.window.loadURL(this.url)
                this.window.on('ready-to-show', () => this.window.show())
                this.initialized = true
                sites[0].window.webContents.send('started', this.id)
            } else this.window.show()
        })
        this.window.on('blur',  () => this.window.hide())

        // Ensure the window opens to appropriate size and location.
        this.window.on('show', () => {
            const bounds = { width: 0, height: 0, x: 0, y: 0 }
            const { screen } = require('electron')
        
            // Get the dimensions to work with.
            const { width, height } = screen.getPrimaryDisplay().workAreaSize
            const { x, y } = this.tray.getBounds()

            // Properly size the window to the screen.
            bounds.width = Math.floor(width / 3)
            bounds.height = Math.floor(height / 1.2)
            
            // Screen Location (Near the Tray Icon)
            bounds.x = (x > (width / 2))    ? (width - bounds.width - 50)   : 50
            bounds.y = (y > (height / 2))   ? (height - bounds.height - 50) : 50

            this.window.setBounds(bounds)
        })
    }
}

// Quick function to add sites to array.
async function addSite(url) {
    const icon = nativeImage.createFromBuffer(await awGet(`https://www.google.com/s2/favicons?domain_url=${url}`).catch(onError)) // Thanks Google!
    if(icon) sites.push(new TraySite(url, icon))
    return sites[sites.length - 1]
}

// Electron is ready to proceed.
app.on('ready', async () => {
    // Build main app tray. Main app will always be sites[0]
    sites.push(new TraySite(`${__dirname}/UI/app.html`, nativeImage.createFromPath(`${__dirname}/UI/images/tray.png`), true))

    // Load saved websites if any.
    const saved = await awRead('./sites.json').catch(onError)
    if(saved) {
        const saves = await awJSON(saved).catch(onError)
        if(saves) {
            // Add the new sites to the system Tray.
            Object.keys(saves).forEach(save => addSite(saves[save]))

            // Send a list of sites to the main app window.
            sites[0].window.webContents.send('sites', saves)
        }
    } else sites[0].window.show() // Show main window on first time run.
})

ipcMain.on('add', async (e, data) => {
    const site = await addSite(data)
    e.sender.send('added', { url: site.url, id: site.id })
})

ipcMain.on('start', (e, data) => {

})

ipcMain.on('stop', (e, data) => {
    const site = sites[data]
    console.log(site)
})

ipcMain.on('delete', (e, data) => {

})

/**/