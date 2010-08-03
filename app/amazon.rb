require 'pp'
require 'base64'
require 'rexml/document'
require 'appengine-apis/urlfetch'
require 'hmac/sha2' ## from ruby-openid
require 'config/settings'

module Amazon
  class ItemSearch
    def self.search(category, keyword, page)
      group = "SalesRank,Offers,OfferSummary,ItemAttributes,Images,Reviews"
      sort = if (category == "All")
             then nil
             else "salesrank" end
      Amazon::Request.new({ :Operation     => "ItemSearch",
                            :SearchIndex   => category,
                            :Keywords      => keyword,
                            :ItemPage      => page,
                            :ResponseGroup => group,
                            :Sort          => sort
                          }).response
    end

    def self.recommend_categories(keyword)
      response = Amazon::Request.new({ :Operation     => "ItemSearch",
                                       :SearchIndex   => "All",
                                       :Keywords      => keyword,
                                       :ItemPage      => 1,
                                       :ResponseGroup => "ItemAttributes"
                                     }).response
      unless response.is_valid
        warn "Invalid"
        return []
      end

      if response.errors.length > 0
        pp response.errors
        return []
      end

      categories = {}
      response.xml_doc.root.elements.each('//Items/Item') {|item|
        if group = item.elements['./ItemAttributes/ProductGroup']
          group_name = group.text
          if categories[group_name]
            categories[group_name] += 1
          else
            categories[group_name] = 1
          end
        end
      }
      return [] if categories.length == 0
      categories.sort {|a,b|
        b[1] <=> a[1]
      }.map {|pair|
        ProductGroup.search_index_name( pair[0] )
      }
    end
  end

  class ProductGroup
    ## http://developer.amazonwebservices.com/connect/message.jspa?messageID=37593

    TABLE = {
      "Apparel"          => "Apparel",
      "Baby"             => "Baby",
      "Beauty"           => "Beauty",
      "Book"             => "Books",
      "DVD"              => "DVD",
      "Electronics"      => "Electronics",
      "Home Improvement" => "Tools",
      "Gourmet"          => "GourmetFood",
      "Watch"            => "Jewelry",
      "Kitchen"          => "Kitchen",
      "Lawn & Patio"     => "OutdoorLiving",
      "Magazine"         => "Magazines",
      "Magazines"        => "Magazines",
      "Music"            => "Music",
      "Musical Instruments" => "MusicalInstruments",
      "Personal Computer"   => "PCHardware",
      "Software"         => "Software",
      "Toy"              => "Toys",
      "Video"            => "VHS",
      "Video Games"      => "VideoGames",
      "Sporting Goods"   => "SportingGoods",
      "Sports"           => "SportingGoods",
      "Photography"      => "Photo",
      "Office Product"   => "OfficeProducts",
      "Furniture"        => "OfficeProducts",
      "CE"               => "Electronics",
      "Health and Personal Care" => "HealthPersonalCare",
      "Health and Beauty"        => "HealthPersonalCare",
      "Wireless"         => "Wireless",
      "Restaurant Menu"  => "Restaurants",
      "Baby Product"     => "Baby"
    }

    def self.search_index_name(group_name)
      TABLE[group_name] || nil
    end
  end

  class SearchIndex
    JP_TABLE = {
      "All"        => 'すべてのカテゴリー',
      "Apparel"    => 'アパレル',
      "Automotive" => '自動車',
      "Baby"       => 'ベビー',
      "Beauty"     => 'ビューティー',
      "Blended"    => '複合',
      "Books"      => '本・漫画・雑誌',
      "Classical"  => 'クラシック',
      "DVD"        => 'DVD',
      "Electronics" => 'エレクトロニクス',
      "ForeignBooks" => '洋書',
      "Grocery"    => '食品＆飲料',
      "HealthPersonalCare" => 'ヘルスケア',
      "Hobbies"    => 'ホビー',
      "HomeImprovement" => 'DIY',
      "Jewelry"    => 'ジュエリー',
      "Kitchen"    => 'キッチン',
      "Music"      => 'ミュージック',
      "MusicTracks" => '曲名',
      "OfficeProducts" => 'オフィス用品',
      "Shoes"      => 'シューズ',
      "Software"   => 'ソフトウェア',
      "SportingGoods" => 'スポーツ用品',
      "Toys"       => 'おもちゃ',
      "VHS"        => 'VHS',
      "Video"      => 'ビデオ',
      "VideoGames" => 'ゲーム',
      "Watches"    => '時計'
    }

    def self.jp(name)
      JP_TABLE[name] || nil
    end
  end

  class Response
    attr_reader :body

    def initialize(body)
      @body = body
    end

    def xml_doc
      unless @doc
        @doc = REXML::Document.new @body
      end
      @doc
    end

    def is_valid
      return( xml_doc.root.elements['//Request/IsValid'].text == 'True' )
    rescue
      false
    end

    def errors
      ary = []
      xml_doc.root.elements.each('//Error') {|err|
        ary.push err.elements['./Message'].text
      }
      ary
    end
  end

  ##
  ## Make URL for request, and Fetch
  ##
  class Request
    def initialize(params)
      @params = params
    end

    def response
      body = fetch
      Amazon::Response.new(body)
    end

    def fetch
      url = make_url(@params)
      AppEngine::URLFetch.fetch(url).body
    end

    def make_url(params)
      hostname = "ecs.amazonaws.jp"
      path = "/onca/xml"
      params_str = format_params(params)
      sig = sign([ "GET",
                   hostname,
                   path,
                   params_str
                 ].join("\n"))
      "http://#{hostname}#{path}?#{params_str}&Signature=#{ rfc3986_escape(sig) }"
    end

    def format_params(params)
      params[:Service] = "AWSECommerceService"
      params[:Version] = "2009-03-31"
      params[:AWSAccessKeyId] = Settings::AMAZON_ACCESS_KEY
      params[:Timestamp] = Time.now.getutc.strftime("%Y-%m-%dT%H:%M:%SZ")
      params.map {|k, v|
        [ k.to_s, rfc3986_escape(v.to_s) ].join("=")
      }.sort.join("&")
    end

    def sign(str)
      digest = HMAC::SHA256.digest(Settings::AMAZON_SECRET_KEY, str)
      Base64.encode64(digest).chomp
    end

    def rfc3986_escape(str)
      safe_char = Regexp.new(/[A-Za-z0-9\-_.~]/)
      encoded = ""
      str.each_byte{|chr|
        if safe_char =~ chr.chr
          encoded = encoded + chr.chr
        else
          encoded = encoded + "%" + chr.chr.unpack("H*")[0].upcase
        end
      }
      return encoded
    end
  end


  #
  # Search Products
  # 必要な値を取り出す。適当にソート。
  #
  # class Products < Array
  #   def search(category, keyword)
  #     response = fetch(category, keyword, 1)
  #     add_items(response.Items)

  #     total_pages = response.Items.TotalPages.to_i
  #     if total_pages > 1 then
  #       if total_pages > 10
  #         total_pages = 10
  #       end
  #       Range.new(2, total_pages).each {|page|
  #         puts "== page: #{page}"
  #         response = fetch(category, keyword, page)
  #         add_items(response.Items)
  #       }
  #     end
  #   end

  #   def to_a
  #     self.map {|product|
  #       if product then
  #         product.to_hash
  #       end
  #     }
  #   end

  #   def add_items(items)
  #     items.Items.each {|item|
  #       push(Product.new(item))
  #     }
  #   end

  #   #
  #   # @return [XMLObject]
  #   #
  #   def fetch(category, keyword, page)
  #     body = Request.new.fetch({ :Operation => "ItemSearch",
  #                                :SearchIndex => category,
  #                                :Keywords => keyword,
  #                                :ItemPage => page,
  #                                :ResponseGroup => "Small,SalesRank,ItemAttributes,Images",
  #                                :Sort => "salesrank" })
  #     response = XMLObject.new(body)
  #     if err = response.Error rescue nil then
  #       warn err.Message
  #       raise(err.Message)
  #     end
  #     response
  #   end
  # end
end

## SearchIndex-ItemSearch Parameter Combination JP
## - http://docs.amazonwebservices.com/AWSECommerceService/latest/DG/index.html?JPSearchIndexParamForItemsearch.html
## - Books, Electronics...
