const { EventEmitter } = require('events')
const { BrowserWindow, Tray } = require('electron')

class TraySite extends EventEmitter {
    constructor(url, icon, init = false) {
        super()
        this.url    = url
        this.init   = false // Whether or not the user has clicked on the tray icon.
        this.icon   = icon
        this.id     = Math.random().toString(36).substring(2)   // jQuery has a cry if I just use the URL.
        this.tray   = new Tray(this.icon)
        this.window = new BrowserWindow({ frame: false, show: false })

        // Config and Bind Tray.
        this.tray.on('click', e => {
            if(!this.init) {
                // Load the URL and open when ready.
                this.window.loadURL(this.url)
                this.window.on('ready-to-show', () => this.window.show())
            } else this.window.show()
        })

        this.window.on('show', () => {
            // Set init.
            if(!this.init) {
                this.init = true
                this.emit('init')
            }

            // Ensure dimensions and boundaries.
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

module.exports = TraySite