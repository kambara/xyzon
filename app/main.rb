$KCODE = "u"
require 'sinatra'
require 'dm-core'
require 'haml'

set :haml, {:format => :html5}
set :views, File.dirname(__FILE__) + '/views'

get '/' do
  haml :index
end

get '/search' do
  @keyword = params['keyword']
  @recommend_categories =
    Amazon::ItemSearch.recommend_categories(@keyword)
  category = params['category']
  @recommend_categories.delete category unless category == 'All'
  haml :search2
end

get '/test' do
  categories = Amazon::ItemSearch.recommend_categories("ruby ")
  categories.join(" ")
end

#
# Search API
# format: xml/yaml/json
# /xml/search/category/keyword/1
#
get '/ajax/search/:category/:keyword/:page/:format' do
  body = Amazon::ItemSearch.search(params[:category],
                                   params[:keyword] + " ",
                                   params[:page]
                                   ).body
  case params[:format]
  when "xml"
    output_xml body
  when "yaml"
    output_yaml Hash.from_xml(body).to_yaml
  when "json"
    outpus_json Hash.from_xml(body).to_json
  end
end

def output_xml(body)
  content_type "text/xml"
  body
end

def output_yaml(body)
  content_type "text"
  body
end

def output_json(body)
  content_type "application/json"
  body
end

## Product Advertising API Developer Guide (API Version 2009-11-01)
## - http://docs.amazonwebservices.com/AWSECommerceService/2009-11-01/DG/
## - 
