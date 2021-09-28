import dotenv from 'dotenv'
import { Builder, By, until, Key } from 'selenium-webdriver'
import chrome from 'selenium-webdriver/chrome.js'
import cheerio from 'cheerio'

dotenv.config()

const YEAR = new Date().getFullYear()

console.log(`playerName,teamName`)
;(async function () {
    const opts = new chrome.Options()

    let driver = await new Builder().forBrowser('chrome').build()

    try {
        console.error('Go to https://www.espn.com/fantasy/')
        await driver.get('https://www.espn.com/fantasy/')

        console.error('Get Log in button')
        await driver.wait(
            until.elementLocated(By.xpath("//button[text()='Log In']")),
            10000
        )
        const loginButtons = await driver.findElements(
            By.xpath("//button[text()='Log In']")
        )

        // One of the login buttons is invisible and selenium doesn't like that. I think the second one is always visible...
        const loginButton = loginButtons[1]

        await loginButton.click()

        console.error('Find the iframe')
        const frame = await driver.findElement(By.css('#disneyid-iframe'))
        await driver.switchTo().frame(frame)

        console.error('Enter login')
        await driver.wait(
            until.elementLocated(By.css('.field-username-email input'))
        )
        await driver
            .findElement(By.css('.field-username-email input'))
            .sendKeys(process.env.USERNAME)

        await driver
            .findElement(By.css('.field-password input'))
            .sendKeys(process.env.PASSWORD, Key.ENTER)

        console.error('Find skip button')
        const skipButton = await driver.wait(
            until.elementLocated(By.xpath("//button[text()='Skip']")),
            10000
        )

        console.error('Click skip')
        await skipButton.click()

        console.error('Wait for page to reload')
        await driver.wait(until.elementLocated(By.id('fantasy-feed__header')))

        console.error('Get all years')
        await driver.get(
            `https://fantasy.espn.com/football/league/draftrecap?seasonid=${YEAR}&leagueId=849989`
        )

        const yearDropdown = await driver.wait(
            until.elementLocated(By.css('.league--seasons--dropdown select'))
        )

        const yearHTML = await yearDropdown.getAttribute('innerHTML')
        const years = getYears(yearHTML)

        console.error('Loop years')
        for (let year of years) {
            await getRooster(driver, year)
        }
    } catch (e) {
        console.error(e)
    } finally {
        await driver.quit()
    }
})()

async function getRooster(driver, year) {
    try {
        await driver.get(
            `https://fantasy.espn.com/football/league/draftrecap?seasonid=${year}&leagueId=849989`
        )
        const tables = driver.wait(
            until.elementLocated(By.css('.DraftPage-tables'))
        )
        const tableHTML = await tables.getAttribute('innerHTML')

        const $ = cheerio.load(tableHTML)

        const rounds = $('.InnerLayout__child')

        rounds.each(function () {
            const round = $(this).find('.Table__TBODY tr')

            round.each(function () {
                const td = $(this)
                const playerName = td.find('.Player .AnchorLink').text()
                const teamName = td
                    .find('.team__column .AnchorLink span')
                    .text()

                console.log(`${playerName},${teamName},${year}`)
            })
        })
    } catch (e) {
        throw e
    }
}

function getYears(yearHTML) {
    const $ = cheerio.load(yearHTML)

    const years = []
    $('option').each(function () {
        years.push($(this).text())
    })

    return years.sort()
}
