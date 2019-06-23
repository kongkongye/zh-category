// ==UserScript==
// @name         My知乎目录
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  知乎长文目录，方便阅读。
// @author       空空叶
// @match        https://www.zhihu.com
// @grant        none
// @license      Apache
// @require http://cdn.staticfile.org/jquery/3.4.1/jquery.min.js
// ==/UserScript==

(function() {
    'use strict';

    /**
     * 文章列表
     */
    let articles = []
    let articlesMap = {}
    /**
     * 当前文章，可以没有
     */
    let currentArticle
    /**
     * 标题条
     */
    let titleBar
    /**
     * 最顶端那条的高度
     */
    let appHeaderHeight = 0;

    (() => {
        Array.prototype.removeIf = function(callback) {
            let i = 0;
            while (i < this.length) {
                if (callback(this[i], i)) {
                    this.splice(i, 1);
                }
                else {
                    ++i;
                }
            }
        };
    })()

    /**
     * 常量
     */
    let Consts = {
        textColorSel: '#76839b',//文字选中颜色
        textColorUnSel: '#8590a6',//文字未选中颜色
    }

    /**
     * 实用类
     */
    let Utils = {
        // Generate four random hex digits.
        S4: () => (((1+Math.random())*0x10000)|0).toString(16).substring(1),
        // Generate a pseudo-GUID by concatenating random hexadecimal.
        guid: () => (Utils.S4()+Utils.S4()+"-"+Utils.S4()+"-"+Utils.S4()+"-"+Utils.S4()+"-"+Utils.S4()+Utils.S4()+Utils.S4()),

        //获取属性
        getAttr: (ele, key) => $(ele).attr(key),
        //设置属性
        setAttr: (ele, key, value) => $(ele).attr(key, value),

        //滚动
        goToByScroll: ele => {
            $('html,body').animate({
                scrollTop: $(ele).offset().top - appHeaderHeight
            }, 'slow');
        },
        goToEndByScroll: ele => {
            $('html,body').animate({
                scrollTop: $(ele).offset().top + $(ele).height() - $(window).height()
            }, 'slow');
        },
    };

    /**
     * 文章类
     */
    let Article = function({id, $root}) {
        this.id = id
        this.$root = $root
        this.data = {}
        /**
         * 类型：
         * Question问题（忽略）
         * Post
         * Answer
         */
        // this.type
        this.titles = []
        this.titlesMap = {}

        $root.css('border-radius', '5px')
        $root.css('border', 'dashed 1px transparent')
        $root.css('margin', '-1px')

        $root.hover(() => toggleCurrentArticle(this), () => {})

        //文章数据
        let $ContentItem = $('.ContentItem', $root)
        let data = $ContentItem.attr('data-zop')
        this.data = JSON.parse(data)


        // let $Feed = $('.Feed', $root)
        // let data = $Feed.attr('data-za-extra-module')
        // data = JSON.parse(data)
        // this.type = data.card.content.type

        // if (this.type === 'Post' || this.type === 'Answer') {
            let $RichText = $('.RichText', $root)
            $('h1,h2,h3,h4,h5,h6', $RichText).each((index, $title) => {
                $title = $($title)
                let id = Utils.guid()
                let title = {
                    id: id,
                    ele: $title,
                    content: $title.text()
                }
                this.titles.push(title)
                this.titlesMap[id] = title
            })
            console.debug(this.titles)
        // }
    }

    /**
     * 切换当前的文章
     * @param article 可为null
     */
    let toggleCurrentArticle = article => {
        if (currentArticle === article) {
            return
        }
        console.debug('[切换当前文章]', article)
        currentArticle = article
        refreshTitleBar()
    }

    /**
     * 刷新标题条（根据当前文章）
     */
    let refreshTitleBar = () => {
        //当前没有文章
        if (!currentArticle) {
            titleBar.hide()
            return
        }

        //有标题
        let titleBarContent = $('<div style="padding: 5px 10px;display: flex;flex-direction: column;"></div>')
        //标题
        let titleLine = $('<div style="align-self: center;text-align: center;">'+currentArticle.data.title+'</div>')
        titleLine.css('color', Consts.textColorSel)
        titleBarContent.append(titleLine)
        //到顶部
        let toTop = $('<a href="javascript: void(0)" style="align-self: center;margin-top: 5px;">↑到顶部↑</a>')
        toTop.on('click', () => Utils.goToByScroll(currentArticle.$root))
        toTop.hover(() => toTop.css('color', Consts.textColorSel), () => toTop.css('color', Consts.textColorUnSel))
        titleBarContent.append(toTop)
        //中间标题
        currentArticle.titles.forEach(item => {
            let titleEle = $('<a href="javascript: void(0)" ' +
                'style="border-radius: 5px;border: solid 1px lightgrey;padding: 5px 10px;margin-top: 5px;"' +
                '>'+item.content+'</a>')
            titleEle.hover(() => {
                titleEle.css('border-style', 'inset')
                titleEle.css('color', Consts.textColorSel)
            }, () => {
                titleEle.css('border-style', 'solid')
                titleEle.css('color', Consts.textColorUnSel)
            })
            titleEle.on('click', () => Utils.goToByScroll(item.ele))
            titleBarContent.append(titleEle)
        })
        //到底部
        let toBottom = $('<a href="javascript: void(0)" style="align-self: center;margin-top: 5px;margin-bottom: 5px;">↓到底部↓</a>')
        toBottom.on('click', () => Utils.goToEndByScroll(currentArticle.$root))
        toBottom.hover(() => toBottom.css('color', Consts.textColorSel), () => toBottom.css('color', Consts.textColorUnSel))
        titleBarContent.append(toBottom)

        //更新标题内容
        titleBar.children().remove()
        titleBar.append(titleBarContent)
        titleBar.show()
    }

    /**
     * 刷新
     */
    let refresh = () => {
        console.debug('[刷新]')
        //得到打开的问题列表
        let $TopstoryItems = $('.TopstoryItem').filter((index, ele) => {
            let RichContent = $('.RichContent', ele)
            return RichContent && RichContent.length > 0 && !RichContent.hasClass('is-collapsed')
        })

        //全部初始化
        let activeIds = {}
        $TopstoryItems.each((index, ele) => {
            let id = init($(ele))
            if (id) {
                activeIds[id] = true
            }
        })
        articles.removeIf(e => {
            if (!activeIds[e.id]) {
                //注销事件
                e.$root.off()
                return true
            }
        })
        articlesMap = {}
        articles.forEach(article => articlesMap[article.id] = article)
        //检测刷新当前文章
        if (currentArticle && !articlesMap[currentArticle.id]) {
            toggleCurrentArticle(null)
        }
        //日志
        console.debug('[打开的文章]', articles)
    }

    /**
     * 初始化
     * @param $TopstoryItem 打开的项
     * @return id
     */
    let init = $TopstoryItem => {
        let id = $TopstoryItem.attr('id')
        //已经有id了
        if (id) {
            if (articlesMap[id]) {//缓存有效
                console.debug('[已经有缓存了]', id)
                return id
            }else {
                //缓存失效了
            }
        }

        //生成id
        id = Utils.guid()
        //设置
        $TopstoryItem.attr('id', id)
        try { //生成文章
            let article = new Article({
                id,
                $root: $TopstoryItem
            })
            //添加缓存
            articles.push(article)
            articlesMap[id] = article
            //日志
            console.info('[初始化]', id, article, $TopstoryItem)
            return id
        } catch (e) {
            console.debug('[初始化失败]', $TopstoryItem)
        }
    }

    /**
     * 获取有指定类名的父类
     * @param element 当前元素
     * @param className 类名
     * @return 未找到返回null(如果本身就有此类名，则返回本身)
     */
    let _getParent = (element, className) => {
        //元素为null
        if (!element || $(element).length === 0) {
            return null
        }

        //本身
        if ($(element).hasClass(className)) {
            return $(element)
        }

        //父
        return _getParent($(element).parent(), className)
    }

    $(document).click(({target}) => {
        console.debug('[点击]', target)
        setTimeout(refresh)
    })

    //ready时运行
    $(() => {
        //计算头部高度
        appHeaderHeight = $('.AppHeader').height()

        //初始化标题条
        let GlobalSideBar = $('.GlobalSideBar')
        let topBottomMargin = appHeaderHeight+30;
        titleBar = $('<div id="tagsTitleBar" style="position: fixed;top: '+topBottomMargin+'px;bottom: '+topBottomMargin+'px;background-color: rgba(255, 255, 255, 0.95);z-index: 180;opacity: 0.5;border-radius: 5px;overflow-y: auto;box-shadow: rgba(152, 152, 152, 0.5) 0px 1px 3px;word-break: break-word;"></div>')
        titleBar.css('color', Consts.textColorUnSel)
        titleBar.width(GlobalSideBar.width())
        titleBar.hover(() => {
            titleBar.css('opacity', '1')
        }, () => {
            titleBar.css('opacity', '0.5')

        })
        titleBar.hide()
        GlobalSideBar.append(titleBar)
    })
})();