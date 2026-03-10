自动抓取和同步kilterboard数据到本地

提供用户名和密码，自动抓取改用户的所有攀爬数据到本地数据库

kilterboard api的sample request/response (request在kilter文件中，response 在.json文件）已经放到了rest目录

目前对kilterboard api的理解：

/sessions 登录api

/sync 主要的数据来源
通过传入资源名称和更新时间获取增量数据，我们主要关注的资源：
- climbs 线路信息
- climb_stats 线路统计信息
- ascents 该用户完成的线路
- bids 该用户尝试但没有完成的线路

/climbs/{id}/info?angle=40&_version=2 线路详细信息
/climbs/{id}/notifications?climbs=1&ascents=1 线路 comments
/climbs/{id}/logbook?climbs=1&ascents=1&bids=1 该用户在该线路的logbook

用python抓取所有 climbs, ascents, bids 信息并存放到sqlite中，为以后数据分析做准备

按一下步骤编写：
1. 分析kilterboard api 并生成spec文档等待审核
2. 确认api spec后，设计数据库并等待审核
3. 确认数据库spec后，尝试抓取2026年的数据
